#![feature(box_syntax)]
#![feature(box_patterns)]
#![feature(never_type)]
#![recursion_limit = "2048"]

extern crate fxhash;
#[macro_use]
extern crate neon;
extern crate failure;
extern crate lazy_static;
extern crate neon_serde;
extern crate path_clean;
extern crate serde;
extern crate serde_json;
extern crate sourcemap;
extern crate swc;

mod config;
mod error;

use crate::{
    config::{BuiltConfig, Config, Options, ParseOptions, RootMode},
    error::Error,
};
use neon::prelude::*;
use path_clean::clean;
use serde::Serialize;
use sourcemap::SourceMapBuilder;
use std::{
    fs::File,
    path::{Path, PathBuf},
    sync::Arc,
};
use swc::{
    common::{
        self, comments::Comments, errors::Handler, FileName, FilePathMapping, FoldWith, Globals,
        SourceFile, SourceMap, GLOBALS,
    },
    ecmascript::{
        ast::Module,
        codegen::{self, Emitter},
        parser::{Parser, Session as ParseSess, SourceFileInput, Syntax},
        transforms::helpers::{self, Helpers},
    },
};

pub type SourceMapString = String;

pub struct Compiler {
    pub globals: Globals,
    pub cm: Arc<SourceMap>,
    handler: Handler,
}

impl Compiler {
    pub(crate) fn new(cm: Arc<SourceMap>, handler: Handler) -> Self {
        Compiler {
            cm,
            handler,
            globals: Globals::new(),
        }
    }

    /// Handles config merging.
    pub(crate) fn config_for_file(
        &self,
        opts: &Options,
        fm: &SourceFile,
    ) -> Result<BuiltConfig, Error> {
        let Options {
            ref root,
            root_mode,
            swcrc,
            ..
        } = opts;
        let root = root
            .clone()
            .unwrap_or_else(|| ::std::env::current_dir().unwrap());

        if *swcrc {
            match fm.name {
                FileName::Real(ref path) => {
                    let mut parent = path.parent();
                    while let Some(dir) = parent {
                        let swcrc = dir.join(".swcrc");

                        if swcrc.exists() {
                            let mut r = File::open(&swcrc)
                                .map_err(|err| Error::FailedToReadConfigFile { err })?;
                            let config: Config = serde_json::from_reader(r)
                                .map_err(|err| Error::FailedToParseConfigFile { err })?;
                            let built = opts.build(self, Some(config));
                            return Ok(built);
                        }

                        if dir == root && *root_mode == RootMode::Root {
                            break;
                        }
                        parent = dir.parent();
                    }
                }
                _ => {}
            }
        }

        let built = opts.build(self, None);
        Ok(built)
    }

    pub(crate) fn run<F, T>(&self, op: F) -> T
    where
        F: FnOnce() -> T,
    {
        GLOBALS.set(&self.globals, op)
    }

    pub(crate) fn parse_js(
        &self,
        fm: Arc<SourceFile>,
        syntax: Syntax,
        comments: Option<&Comments>,
    ) -> Result<Module, Error> {
        let session = ParseSess {
            handler: &self.handler,
        };
        let mut parser = Parser::new(session, syntax, SourceFileInput::from(&*fm), comments);
        let module = parser.parse_module().map_err(|mut e| {
            e.emit();
            Error::FailedToParseModule {}
        })?;

        Ok(module)
    }

    pub(crate) fn process_js_file(
        &self,
        fm: Arc<SourceFile>,
        opts: Options,
    ) -> Result<TransformOutput, Error> {
        self.run(|| {
            if error::debug() {
                eprintln!("processing js file: {:?}", fm)
            }

            let config = self.config_for_file(&opts, &*fm)?;

            let comments = Default::default();
            let module = self.parse_js(
                fm.clone(),
                config.syntax,
                if config.minify { None } else { Some(&comments) },
            )?;
            let mut pass = config.pass;
            let module = helpers::HELPERS.set(&Helpers::new(config.external_helpers), || {
                module.fold_with(&mut pass)
            });

            self.print(&module, fm, &comments, config.source_maps, config.minify)
        })
    }

    fn print(
        &self,
        module: &Module,
        fm: Arc<SourceFile>,
        comments: &Comments,
        source_map: bool,
        minify: bool,
    ) -> Result<TransformOutput, Error> {
        self.run(|| {
            let mut src_map_builder = SourceMapBuilder::new(None);

            match fm.name {
                FileName::Real(ref p) => {
                    let id = src_map_builder.add_source(&p.display().to_string());
                    src_map_builder.set_source_contents(id, Some(&fm.src));
                }
                _ => {}
            }

            let src = {
                let mut buf = vec![];
                {
                    let handlers = box MyHandlers;
                    let mut emitter = Emitter {
                        cfg: codegen::Config { minify },
                        comments: if minify { None } else { Some(&comments) },
                        cm: self.cm.clone(),
                        wr: box swc::ecmascript::codegen::text_writer::JsWriter::new(
                            self.cm.clone(),
                            "\n",
                            &mut buf,
                            if source_map {
                                Some(&mut src_map_builder)
                            } else {
                                None
                            },
                        ),
                        handlers,
                        pos_of_leading_comments: Default::default(),
                    };

                    emitter
                        .emit_module(&module)
                        .map_err(|err| Error::FailedToEmitModule { err })?;
                }
                String::from_utf8(buf).map_err(|err| Error::CodeNotUtf8 { err })?
            };
            Ok(TransformOutput {
                code: src,
                map: if source_map {
                    let mut buf = vec![];
                    src_map_builder
                        .into_sourcemap()
                        .to_writer(&mut buf)
                        .map_err(|err| Error::FailedToWriteSourceMap { err })?;
                    let map =
                        String::from_utf8(buf).map_err(|err| Error::SourceMapNotUtf8 { err })?;
                    Some(map)
                } else {
                    None
                },
            })
        })
    }
}

struct MyHandlers;

impl swc::ecmascript::codegen::Handlers for MyHandlers {}

fn init(_cx: MethodContext<JsUndefined>) -> NeonResult<ArcCompiler> {
    let cm = Arc::new(SourceMap::new(FilePathMapping::empty()));

    let handler = Handler::with_tty_emitter(
        common::errors::ColorConfig::Always,
        true,
        false,
        Some(cm.clone()),
    );

    let c = Compiler::new(cm.clone(), handler);

    Ok(Arc::new(c))
}

struct TransformTask {
    c: Arc<Compiler>,
    fm: Arc<SourceFile>,
    options: Options,
}

struct TransformFileTask {
    c: Arc<Compiler>,
    path: PathBuf,
    options: Options,
}

#[derive(Serialize)]
struct TransformOutput {
    code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    map: Option<String>,
}

impl TransformOutput {
    fn complete(mut cx: TaskContext, result: Result<TransformOutput, Error>) -> JsResult<JsValue> {
        match result {
            Ok(output) => Ok(neon_serde::to_value(&mut cx, &output)?),
            Err(err) => cx.throw_error(err.to_string()),
        }
    }
}

impl Task for TransformTask {
    type Output = TransformOutput;
    type Error = Error;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        self.c
            .process_js_file(self.fm.clone(), self.options.clone())
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        TransformOutput::complete(cx, result)
    }
}

impl Task for TransformFileTask {
    type Output = TransformOutput;
    type Error = Error;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let fm = self
            .c
            .cm
            .load_file(&self.path)
            .map_err(|err| Error::FailedToReadModule { err })?;

        self.c.process_js_file(fm, self.options.clone())
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        TransformOutput::complete(cx, result)
    }
}

fn transform(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let source = cx.argument::<JsString>(0)?;
    let options_arg = cx.argument::<JsValue>(1)?;
    let options: Options = neon_serde::from_value(&mut cx, options_arg)?;
    let callback = cx.argument::<JsFunction>(2)?;

    let this = cx.this();
    {
        let guard = cx.lock();
        let c = this.borrow(&guard);
        let fm = c.cm.new_source_file(
            if options.filename.is_empty() {
                FileName::Anon
            } else {
                FileName::Real(options.filename.clone().into())
            },
            source.value(),
        );

        TransformTask {
            c: c.clone(),
            fm,
            options,
        }
        .schedule(callback);
    };

    Ok(cx.undefined().upcast())
}

fn transform_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let source = cx.argument::<JsString>(0)?;
    let options: Options = match cx.argument_opt(1) {
        Some(v) => neon_serde::from_value(&mut cx, v)?,
        None => {
            let obj = cx.empty_object().upcast();
            neon_serde::from_value(&mut cx, obj)?
        }
    };

    let this = cx.this();
    let output = {
        let guard = cx.lock();
        let c = this.borrow(&guard);
        let fm = c.cm.new_source_file(
            if options.filename.is_empty() {
                FileName::Anon
            } else {
                FileName::Real(options.filename.clone().into())
            },
            source.value(),
        );

        c.process_js_file(fm, options)
            .expect("failed to process js file")
    };

    Ok(neon_serde::to_value(&mut cx, &output)?)
}

fn transform_file(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let path = cx.argument::<JsString>(0)?;
    let path_value = path.value();
    let path = Path::new(&path_value);

    let options_arg = cx.argument::<JsValue>(1)?;
    let options: Options = neon_serde::from_value(&mut cx, options_arg)?;
    let callback = cx.argument::<JsFunction>(2)?;

    let this = cx.this();
    {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        TransformFileTask {
            c: c.clone(),
            path: path.into(),
            options,
        }
        .schedule(callback);
    };

    Ok(cx.undefined().upcast())
}

fn transform_file_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let path = cx.argument::<JsString>(0)?;
    let opts: Options = match cx.argument_opt(1) {
        Some(v) => neon_serde::from_value(&mut cx, v)?,
        None => {
            let obj = cx.empty_object().upcast();
            neon_serde::from_value(&mut cx, obj)?
        }
    };

    let path_value = path.value();
    let path_value = clean(&path_value);
    let path = Path::new(&path_value);

    let this = cx.this();
    let output = {
        let guard = cx.lock();
        let c = this.borrow(&guard);
        let fm = c.cm.load_file(path).expect("failed to load file");
        c.process_js_file(fm, opts)
            .expect("failed to process js file")
    };

    Ok(neon_serde::to_value(&mut cx, &output)?)
}

// ----- Parsing -----

struct ParseTask {
    c: Arc<Compiler>,
    fm: Arc<SourceFile>,
    options: ParseOptions,
}

struct ParseFileTask {
    c: Arc<Compiler>,
    path: PathBuf,
    options: ParseOptions,
}

fn complete_parse(mut cx: TaskContext, result: Result<Module, Error>) -> JsResult<JsValue> {
    match result {
        Ok(module) => Ok(neon_serde::to_value(&mut cx, &module)?),
        Err(err) => cx.throw_error(err.to_string()),
    }
}

impl Task for ParseTask {
    type Output = Module;
    type Error = Error;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let comments = Default::default();

        self.c.parse_js(
            self.fm.clone(),
            self.options.syntax,
            if self.options.comments {
                Some(&comments)
            } else {
                None
            },
        )
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        complete_parse(cx, result)
    }
}

impl Task for ParseFileTask {
    type Output = Module;
    type Error = Error;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let comments = Default::default();
        let fm = self
            .c
            .cm
            .load_file(&self.path)
            .map_err(|err| Error::FailedToReadModule { err })?;

        self.c.parse_js(
            fm,
            self.options.syntax,
            if self.options.comments {
                Some(&comments)
            } else {
                None
            },
        )
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        complete_parse(cx, result)
    }
}

fn parse(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let src = cx.argument::<JsString>(0)?;
    let options_arg = cx.argument::<JsValue>(1)?;
    let options: ParseOptions = neon_serde::from_value(&mut cx, options_arg)?;
    let callback = cx.argument::<JsFunction>(2)?;

    let this = cx.this();
    {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        let fm = c.cm.new_source_file(FileName::Anon, src.value());

        ParseTask {
            c: c.clone(),
            fm,
            options,
        }
        .schedule(callback);
    };

    Ok(cx.undefined().upcast())
}

fn parse_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let src = cx.argument::<JsString>(0)?;
    let options_arg = cx.argument::<JsValue>(1)?;
    let options: ParseOptions = neon_serde::from_value(&mut cx, options_arg)?;

    let this = cx.this();
    let module = {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        let fm = c.cm.new_source_file(FileName::Anon, src.value());
        let comments = Default::default();

        c.parse_js(
            fm,
            options.syntax,
            if options.comments {
                Some(&comments)
            } else {
                None
            },
        )
    };
    let module = match module {
        Ok(v) => v,
        Err(err) => return cx.throw_error(err.to_string()),
    };

    Ok(neon_serde::to_value(&mut cx, &module)?)
}

fn parse_file_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let path = cx.argument::<JsString>(0)?;
    let options_arg = cx.argument::<JsValue>(1)?;
    let options: ParseOptions = neon_serde::from_value(&mut cx, options_arg)?;

    let this = cx.this();
    let module = {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        let fm =
            c.cm.load_file(Path::new(&path.value()))
                .expect("failed to read module file");
        let comments = Default::default();

        c.parse_js(
            fm,
            options.syntax,
            if options.comments {
                Some(&comments)
            } else {
                None
            },
        )
    };
    let module = match module {
        Ok(v) => v,
        Err(err) => return cx.throw_error(err.to_string()),
    };

    Ok(neon_serde::to_value(&mut cx, &module)?)
}

fn parse_file(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let path = cx.argument::<JsString>(0)?;
    let options_arg = cx.argument::<JsValue>(1)?;
    let options: ParseOptions = neon_serde::from_value(&mut cx, options_arg)?;
    let callback = cx.argument::<JsFunction>(2)?;

    let this = cx.this();
    {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        ParseFileTask {
            c: c.clone(),
            path: path.value().into(),
            options,
        }
        .schedule(callback);
    };

    Ok(cx.undefined().upcast())
}

// ----- Printing -----

struct PrintTask {
    c: Arc<Compiler>,
    module: Module,
    options: Options,
}

impl Task for PrintTask {
    type Output = TransformOutput;
    type Error = Error;
    type JsEvent = JsValue;
    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let fm = self.c.cm.new_source_file(FileName::Anon, "".into());
        let comments = Default::default();

        self.c.print(
            &self.module,
            fm,
            &comments,
            self.options.source_maps.is_some(),
            self.options
                .config
                .clone()
                .unwrap_or_default()
                .minify
                .unwrap_or(false),
        )
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        TransformOutput::complete(cx, result)
    }
}

fn print(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let module = cx.argument::<JsValue>(0)?;
    let module: Module = neon_serde::from_value(&mut cx, module)?;

    let options = cx.argument::<JsValue>(1)?;
    let options: Options = neon_serde::from_value(&mut cx, options)?;

    let callback = cx.argument::<JsFunction>(2)?;

    let this = cx.this();
    {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        PrintTask {
            c: c.clone(),
            module,
            options,
        }
        .schedule(callback)
    }

    Ok(cx.undefined().upcast())
}

fn print_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let module = cx.argument::<JsValue>(0)?;
    let module: Module = neon_serde::from_value(&mut cx, module)?;

    let options = cx.argument::<JsValue>(1)?;
    let options: Options = neon_serde::from_value(&mut cx, options)?;

    let this = cx.this();
    let result = {
        let guard = cx.lock();
        let c = this.borrow(&guard);
        let fm = c.cm.new_source_file(FileName::Anon, "".into());
        let comments = Default::default();

        c.print(
            &module,
            fm,
            &comments,
            options.source_maps.is_some(),
            options.config.unwrap_or_default().minify.unwrap_or(false),
        )
    };
    let result = match result {
        Ok(v) => v,
        Err(err) => return cx.throw_error(err.to_string()),
    };

    Ok(neon_serde::to_value(&mut cx, &result)?)
}

pub type ArcCompiler = Arc<Compiler>;

declare_types! {
    pub class JsCompiler for ArcCompiler {
        init(cx) {
            init(cx)
        }

        method transform(cx) {
            transform(cx)
        }

        method transformSync(cx) {
            transform_sync(cx)
        }

        method transformFile(cx) {
            transform_file(cx)
        }

        method transformFileSync(cx) {
            transform_file_sync(cx)
        }

        method parse(cx) {
            parse(cx)
        }

        method parseSync(cx) {
            parse_sync(cx)
        }

        method parseFile(cx) {
            parse_file(cx)
        }

        method parseFileSync(cx) {
            parse_file_sync(cx)
        }

        method print(cx) {
            print(cx)
        }

        method printSync(cx) {
            print_sync(cx)
        }
    }
}

register_module!(mut cx, {
    cx.export_class::<JsCompiler>("Compiler")?;
    Ok(())
});
