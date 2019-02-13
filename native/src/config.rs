use crate::Compiler;
use fxhash::{FxHashMap, FxHashSet};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, env, path::PathBuf, sync::Arc};
use swc::{
    atoms::JsWord,
    common::{FileName, SourceMap},
    ecmascript::{
        ast::{Expr, Module, ModuleItem, Stmt},
        parser::{Parser, Session as ParseSess, SourceFileInput, Syntax},
        transforms::{
            chain_at, compat, fixer, helpers, hygiene, modules,
            pass::{noop, Pass},
            proposals::{class_properties, decorators, export_default_from},
            react, simplifier, typescript, InlineGlobals,
        },
    },
};

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct Options {
    #[serde(flatten, default)]
    pub config: Option<Config>,

    #[serde(default = "default_cwd")]
    pub cwd: PathBuf,

    #[serde(default)]
    pub caller: Option<CallerOptions>,

    #[serde(default)]
    pub filename: String,

    #[serde(default)]
    pub config_file: Option<ConfigFile>,

    #[serde(default)]
    pub root: Option<PathBuf>,

    #[serde(default)]
    pub root_mode: RootMode,

    #[serde(default = "default_swcrc")]
    pub swcrc: bool,

    #[serde(default)]
    pub swcrc_roots: Option<PathBuf>,

    #[serde(default = "default_env_name")]
    pub env_name: String,

    #[serde(default)]
    pub input_source_map: Option<InputSourceMap>,

    #[serde(default)]
    pub source_maps: Option<SourceMapsConfig>,

    #[serde(default)]
    pub source_file_name: Option<String>,

    #[serde(default)]
    pub source_root: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub(crate) enum SourceMapsConfig {
    Bool(bool),
    Str(String),
}

impl Default for SourceMapsConfig {
    fn default() -> Self {
        SourceMapsConfig::Bool(true)
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub(crate) enum InputSourceMap {
    Bool(bool),
    Str(String),
}

impl Default for InputSourceMap {
    fn default() -> Self {
        InputSourceMap::Bool(true)
    }
}

impl Options {
    pub fn build(&self, c: &Compiler, config: Option<Config>) -> BuiltConfig {
        let mut config = config.unwrap_or_else(|| Default::default());
        if let Some(ref c) = self.config {
            config.merge(c)
        }

        let JscConfig { transform, syntax } = config.jsc;

        let syntax = syntax.unwrap_or_default();
        let transform = transform.unwrap_or_default();

        let optimizer = transform.optimizer;
        let enable_optimizer = optimizer.is_some();
        let pass = if let Some(opts) =
            optimizer.map(|o| o.globals.unwrap_or_else(|| Default::default()))
        {
            opts.build(c)
        } else {
            GlobalPassOption::default().build(c)
        };

        let pass = chain_at!(
            Module,
            typescript::strip(),
            pass,
            // handle jsx
            react::react(c.cm.clone(), transform.react),
            decorators(),
            class_properties(),
            export_default_from(),
            simplifier(enable_optimizer),
            compat::es2018(),
            compat::es2017(),
            compat::es2016(),
            compat::es2015(),
            compat::es3(),
            ModuleConfig::build(c.cm.clone(), config.module),
            helpers::InjectHelpers { cm: c.cm.clone() },
            hygiene(),
            fixer(),
        );

        BuiltConfig {
            minify: config.minify.unwrap_or(false),
            pass: box pass,
            syntax,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RootMode {
    #[serde(rename = "root")]
    Root,
    #[serde(rename = "upward")]
    Upward,
    #[serde(rename = "upward-optional")]
    UpwardOptional,
}

impl Default for RootMode {
    fn default() -> Self {
        RootMode::Root
    }
}
const fn default_swcrc() -> bool {
    true
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConfigFile {
    Bool(bool),
    Str(String),
}

impl Default for ConfigFile {
    fn default() -> Self {
        ConfigFile::Bool(true)
    }
}

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CallerOptions {
    pub name: String,
}

fn default_cwd() -> PathBuf {
    ::std::env::current_dir().unwrap()
}

/// `.swcrc` file
#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct Config {
    #[serde(default)]
    pub jsc: JscConfig,
    #[serde(default)]
    pub module: Option<ModuleConfig>,
    #[serde(default)]
    pub minify: Option<bool>,
}

/// One `BuiltConfig` per a directory with swcrc
pub(crate) struct BuiltConfig {
    pub pass: Box<dyn Pass + Send + Sync>,
    pub syntax: Syntax,
    pub minify: bool,
}

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct JscConfig {
    #[serde(rename = "parser", default)]
    pub syntax: Option<Syntax>,
    #[serde(default)]
    pub transform: Option<TrnasformConfig>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
#[serde(tag = "type")]
pub(crate) enum ModuleConfig {
    #[serde(rename = "commonjs")]
    CommonJs(modules::common_js::Config),
    #[serde(rename = "umd")]
    Umd(modules::umd::Config),
}

impl ModuleConfig {
    pub fn build(cm: Arc<SourceMap>, config: Option<ModuleConfig>) -> Box<Pass + Send + Sync> {
        match config {
            None => box noop(),
            Some(ModuleConfig::CommonJs(config)) => box modules::common_js::common_js(config),
            Some(ModuleConfig::Umd(config)) => box modules::umd::umd(cm, config),
        }
    }
}

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct TrnasformConfig {
    #[serde(default)]
    pub react: react::Options,
    #[serde(default)]
    pub optimizer: Option<OptimizerConfig>,
}

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct OptimizerConfig {
    #[serde(default)]
    pub globals: Option<GlobalPassOption>,
}

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct GlobalPassOption {
    #[serde(default)]
    pub vars: FxHashMap<String, String>,
    #[serde(default = "default_envs")]
    pub envs: FxHashSet<String>,
}

fn default_envs() -> FxHashSet<String> {
    let mut v = FxHashSet::default();
    v.insert(String::from("NODE_ENV"));
    v.insert(String::from("SWC_ENV"));
    v
}

impl GlobalPassOption {
    pub fn build(self, c: &Compiler) -> InlineGlobals {
        fn mk_map(
            c: &Compiler,
            values: impl Iterator<Item = (String, String)>,
            is_env: bool,
        ) -> HashMap<JsWord, Expr> {
            let mut m = HashMap::new();

            for (k, v) in values {
                let v = if is_env {
                    format!("'{}'", v)
                } else {
                    (*v).into()
                };
                let v_str = v.clone();
                let fm =
                    c.cm.new_source_file(FileName::Custom(format!("GLOBAL.{}", k)), v);
                let session = ParseSess {
                    handler: &c.handler,
                };
                let mut module = Parser::new(
                    session,
                    Syntax::Es(Default::default()),
                    SourceFileInput::from(&*fm),
                    None,
                )
                .parse_module()
                .map_err(|mut e| {
                    e.emit();
                    ()
                })
                .unwrap_or_else(|()| {
                    panic!(
                        "failed to parse global variable {}=`{}` as module",
                        k, v_str
                    )
                });

                let expr = match module.body.pop().unwrap() {
                    ModuleItem::Stmt(Stmt::Expr(box expr)) => expr,
                    _ => panic!("{} is not a valid expression", v_str),
                };

                m.insert((*k).into(), expr);
            }

            m
        }

        let envs = self.envs;
        InlineGlobals {
            globals: mk_map(c, self.vars.into_iter(), false),
            envs: mk_map(c, env::vars().filter(|(k, _)| envs.contains(&*k)), true),
        }
    }
}

fn default_env_name() -> String {
    match env::var("SWC_ENV") {
        Ok(v) => return v,
        Err(_) => {}
    }

    match env::var("NODE_ENV") {
        Ok(v) => return v,
        Err(_) => return "development".into(),
    }
}

pub(crate) trait Merge {
    /// Apply overrides from `from`
    fn merge(&mut self, from: &Self);
}

impl<T: Clone> Merge for Option<T>
where
    T: Merge,
{
    fn merge(&mut self, from: &Option<T>) {
        match *from {
            Some(ref from) => match *self {
                Some(ref mut v) => v.merge(from),
                None => *self = Some(from.clone()),
            },
            // no-op
            None => {}
        }
    }
}

impl Merge for Config {
    fn merge(&mut self, from: &Self) {
        self.jsc.merge(&from.jsc);
        self.module.merge(&from.module);
        self.minify.merge(&from.minify)
    }
}

impl Merge for JscConfig {
    fn merge(&mut self, from: &Self) {
        self.syntax.merge(&from.syntax);
        self.transform.merge(&from.transform);
    }
}

impl Merge for Option<ModuleConfig> {
    fn merge(&mut self, from: &Self) {
        match *from {
            Some(ref c2) => *self = Some(c2.clone()),
            None => {}
        }
    }
}

impl Merge for Option<bool> {
    fn merge(&mut self, from: &Self) {
        match from {
            Some(v) => match self {
                Some(ref mut s) => *s |= *v,
                _ => *self = Some(*v),
            },
            None => {}
        }
    }
}

impl Merge for Syntax {
    fn merge(&mut self, from: &Self) {
        *self = *from;
    }
}

impl Merge for TrnasformConfig {
    fn merge(&mut self, from: &Self) {
        self.optimizer.merge(&from.optimizer);
        self.react.merge(&from.react);
    }
}

impl Merge for OptimizerConfig {
    fn merge(&mut self, from: &Self) {
        self.globals.merge(&from.globals)
    }
}

impl Merge for GlobalPassOption {
    fn merge(&mut self, from: &Self) {
        *self = from.clone();
    }
}

impl Merge for react::Options {
    fn merge(&mut self, from: &Self) {
        *self = from.clone();
    }
}
