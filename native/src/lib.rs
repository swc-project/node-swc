#![feature(box_syntax)]
#![feature(box_patterns)]

extern crate fnv;
#[macro_use]
extern crate neon;
extern crate arc_swap;
extern crate neon_serde;
extern crate serde;
extern crate sourcemap;
extern crate swc;

mod config;

use self::config::{Config, TrnasformConfig};
use neon::prelude::*;
use sourcemap::SourceMapBuilder;
use std::{
    cell::RefCell,
    collections::HashMap,
    fs::File,
    io,
    path::{Path, PathBuf},
    sync::Arc,
};
use swc::{
    common::{
        self, errors::Handler, sync::Lrc, FileName, FilePathMapping, Fold, FoldWith, Globals,
        SourceMap, GLOBALS,
    },
    ecmascript::{
        ast::Module,
        codegen::{self, Emitter},
        parser::{Parser, Session as ParseSess, SourceFileInput, Syntax},
        transforms::{compat, fixer, helpers, hygiene, react, simplifier, typescript},
    },
};

pub struct Compiler {
    pub globals: Globals,
    pub cm: Lrc<SourceMap>,
    handler: Handler,
    config_caches: RefCell<HashMap<PathBuf, Arc<Config>>>,
}

impl Compiler {
    pub fn new(cm: Lrc<SourceMap>, handler: Handler) -> Self {
        Compiler {
            cm,
            handler,
            globals: Globals::new(),
            config_caches: Default::default(),
        }
    }

    pub fn config_for_file(&self, path: &Path) -> Result<Option<Arc<Config>>, io::Error> {
        assert!(!path.is_file());

        let mut parent = path.parent();
        while let Some(dir) = parent {
            let swcrc = dir.join(".swcrc");
            if let Some(c) = self.config_caches.borrow().get(&swcrc) {
                return Ok(Some(c.clone()));
            }

            if swcrc.exists() {
                let mut r = File::open(&swcrc)?;
                let config: Config = serde_json::from_reader(r)?;
                let arc = Arc::new(config);
                self.config_caches.borrow_mut().insert(swcrc, arc.clone());
                return Ok(Some(arc));
            }

            parent = dir.parent();
        }

        Ok(None)
    }

    pub fn run<F, T>(&self, op: F) -> T
    where
        F: FnOnce() -> T,
    {
        GLOBALS.set(&self.globals, op)
    }

    pub fn parse_js(&self, name: FileName, syntax: Syntax, src: &str) -> Result<Module, ()> {
        self.run(|| {
            let fm = self.cm.new_source_file(name, src.into());

            let session = ParseSess {
                handler: &self.handler,
            };
            Parser::new(session, syntax, SourceFileInput::from(&*fm))
                .parse_module()
                .map_err(|e| {
                    e.emit();
                    ()
                })
        })
    }

    /// TODO
    pub fn parse_js_file(&self, syntax: Option<Syntax>, path: &Path) -> Result<Module, ()> {
        self.run(|| {
            let syntax = syntax.unwrap_or_else(|| {
                self.config_for_file(path)
                    .map(|c| c.unwrap_or_else(|| Default::default()).jsc.syntax)
                    .expect("failed to load config")
            });

            let fm = self.cm.load_file(path).expect("failed to load file");

            let session = ParseSess {
                handler: &self.handler,
            };
            Parser::new(session, syntax, SourceFileInput::from(&*fm))
                .parse_module()
                .map_err(|e| {
                    e.emit();
                    ()
                })
        })
    }

    /// Returns code, sourcemap
    pub fn emit_module(
        &self,
        module: &Module,
        cfg: codegen::Config,
    ) -> io::Result<(String, sourcemap::SourceMap)> {
        self.run(|| {
            let mut src_map_builder = SourceMapBuilder::new(None);
            let src = {
                let mut buf = vec![];
                {
                    let handlers = box MyHandlers;
                    let mut emitter = Emitter {
                        cfg,
                        cm: self.cm.clone(),
                        wr: box swc::ecmascript::codegen::text_writer::JsWriter::new(
                            self.cm.clone(),
                            "\n",
                            &mut buf,
                            &mut src_map_builder,
                        ),
                        handlers,
                        pos_of_leading_comments: Default::default(),
                    };

                    emitter.emit_module(&module)?;
                }
                String::from_utf8(buf).unwrap()
            };
            Ok((src, src_map_builder.into_sourcemap()))
        })
    }
}

struct MyHandlers;

impl swc::ecmascript::codegen::Handlers for MyHandlers {}

fn transform_module(c: &Compiler, module: Module, options: TrnasformConfig) -> Module {
    let helpers = Arc::new(helpers::Helpers::default());

    let optimizer = options.optimizer;
    let enable_optimizer = optimizer.is_some();
    let module = {
        let opts = if let Some(opts) =
            optimizer.map(|o| o.globals.unwrap_or_else(|| Default::default()))
        {
            opts
        } else {
            Default::default()
        };
        module.fold_with(&mut opts.build(c))
    };

    // handle jsx
    let module = module.fold_with(&mut react::react(
        c.cm.clone(),
        options.react,
        helpers.clone(),
    ));

    let module = if enable_optimizer {
        module.fold_with(&mut simplifier())
    } else {
        module
    };

    let module = module
        .fold_with(
            &mut typescript::strip()
                .then(compat::es2018(&helpers))
                .then(compat::es2017(&helpers))
                .then(compat::es2016())
                .then(compat::es2015(&helpers))
                .then(compat::es3()),
        )
        .fold_with(&mut hygiene())
        .fold_with(&mut fixer());

    module.fold_with(&mut helpers::InjectHelpers {
        cm: c.cm.clone(),
        helpers: helpers.clone(),
    })
}

fn compiler_init(_cx: MethodContext<JsUndefined>) -> NeonResult<Compiler> {
    let cm = Lrc::new(SourceMap::new(FilePathMapping::empty()));

    let handler = Handler::with_tty_emitter(
        common::errors::ColorConfig::Always,
        true,
        false,
        Some(cm.clone()),
    );

    let c = Compiler::new(cm.clone(), handler);

    Ok(c)
}

fn compiler_transform_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let source = cx.argument::<JsString>(0)?;
    let options: Config = match cx.argument_opt(1) {
        Some(v) => neon_serde::from_value(&mut cx, v)?,
        None => Default::default(),
    };

    let this = cx.this();
    let (code, map) = {
        let guard = cx.lock();
        let c = this.borrow(&guard);
        let module = c
            .parse_js(FileName::Anon(0), options.jsc.syntax, &source.value())
            .expect("failed to parse module");
        let module = c.run(|| transform_module(&c, module, options.jsc.transform));

        c.emit_module(
            &module,
            codegen::Config {
                enable_comments: false,
            },
        )
        .expect("failed to emit module")
    };

    let code = cx.string(&code);

    let obj = cx.empty_object();
    obj.set(&mut cx, "code", code)?;
    {
        let mut buf = vec![];
        map.to_writer(&mut buf).expect("failed to write sourcemap");
        let map =
            cx.string(&String::from_utf8(buf).expect("failed to write sourcemap: invalid utf8"));
        obj.set(&mut cx, "map", map)?;
    }

    Ok(obj.upcast())
}

fn compiler_transform_file_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let path = cx.argument::<JsString>(0)?;
    let config: Option<Config> = match cx.argument_opt(1) {
        Some(v) => Some(neon_serde::from_value(&mut cx, v)?),
        None => None,
    };

    let path_value = path.value();
    let path = Path::new(&path_value);
    let syntax = config.as_ref().map(|c| c.jsc.syntax);

    let this = cx.this();
    let (code, map) = {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        let mut config = config.unwrap_or_else(|| Default::default());
        let config =
            if let Some(overrides) = c.config_for_file(path).expect("failed to load .swcrc file") {
                // config.merge_from(overrides)
                overrides
            } else {
                Arc::new(config)
            };

        let module = c
            .parse_js_file(syntax, path)
            .expect("failed to parse module");
        let module = c.run(|| transform_module(&c, module, config.jsc.transform.clone()));

        c.emit_module(
            &module,
            codegen::Config {
                enable_comments: false,
            },
        )
        .expect("failed to emit module")
    };

    let code = cx.string(&code);

    let obj = cx.empty_object();
    obj.set(&mut cx, "code", code)?;
    {
        let mut buf = vec![];
        map.to_writer(&mut buf).expect("failed to write sourcemap");
        let map =
            cx.string(&String::from_utf8(buf).expect("failed to write sourcemap: invalid utf8"));
        obj.set(&mut cx, "map", map)?;
    }

    Ok(obj.upcast())
}

declare_types! {
    pub class JsCompiler for Compiler {
        init(cx) {
            compiler_init(cx)
        }

        method transformSync(cx) {
            compiler_transform_sync(cx)
        }

        method transformFileSync(cx) {
            compiler_transform_file_sync(cx)
        }
    }
}

register_module!(mut cx, {
    // cx.export_function("transform", transform)?;
    // cx.export_function("transformFileSync", transform_file)?;
    cx.export_class::<JsCompiler>("Compiler")?;
    Ok(())
});
