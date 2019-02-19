#![feature(box_syntax)]
#![feature(box_patterns)]
#![feature(never_type)]
#![recursion_limit = "2048"]

extern crate fxhash;
#[macro_use]
extern crate neon;
extern crate failure;
extern crate neon_serde;
extern crate path_clean;
extern crate serde;
extern crate serde_json;
extern crate sourcemap;
extern crate swc;

mod config;
mod error;

use crate::{
    config::{BuiltConfig, Config, Options, RootMode},
    error::Error,
};
use neon::prelude::*;
use path_clean::clean;
use sourcemap::SourceMapBuilder;
use std::{fs::File, path::Path, sync::Arc};
use swc::{
    common::{
        self, errors::Handler, FileName, FilePathMapping, FoldWith, Globals, SourceFile, SourceMap,
        GLOBALS,
    },
    ecmascript::{
        codegen::{self, Emitter},
        parser::{Parser, Session as ParseSess, SourceFileInput},
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

    pub(crate) fn process_js_file(
        &self,
        fm: Arc<SourceFile>,
        opts: Options,
    ) -> Result<(String, Option<sourcemap::SourceMap>), Error> {
        self.run(|| {
            let config = self.config_for_file(&opts, &*fm)?;

            let session = ParseSess {
                handler: &self.handler,
            };
            let mut parser = Parser::new(
                session,
                config.syntax,
                SourceFileInput::from(&*fm),
                if config.minify {
                    None
                } else {
                    Some(Default::default())
                },
            );
            let module = parser.parse_module().map_err(|mut e| {
                e.emit();
                Error::FailedToParseModule {}
            })?;

            let mut pass = config.pass;
            let module = helpers::HELPERS.set(&Helpers::new(config.external_helpers), || {
                module.fold_with(&mut pass)
            });

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
                        cfg: codegen::Config {
                            minify: config.minify,
                        },
                        comments: parser.take_comments(),
                        cm: self.cm.clone(),
                        wr: box swc::ecmascript::codegen::text_writer::JsWriter::new(
                            self.cm.clone(),
                            "\n",
                            &mut buf,
                            if config.source_maps {
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
            Ok((
                src,
                if config.source_maps {
                    Some(src_map_builder.into_sourcemap())
                } else {
                    None
                },
            ))
        })
    }
}

struct MyHandlers;

impl swc::ecmascript::codegen::Handlers for MyHandlers {}

fn compiler_init(_cx: MethodContext<JsUndefined>) -> NeonResult<ArcCompiler> {
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

struct TransformAsync {
    c: Arc<Compiler>,
    fm: Arc<SourceFile>,
    options: Options,
}
impl Task for TransformAsync {
    type Output = (String, Option<SourceMapString>);
    type Error = Error;
    type JsEvent = JsObject;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        self.c
            .process_js_file(self.fm.clone(), self.options.clone())
            .and_then(|(code, map)| {
                if let Some(map) = map {
                    let mut buf = vec![];
                    map.to_writer(&mut buf)
                        .map_err(|err| Error::FailedToWriteSourceMap { err })?;
                    let map =
                        String::from_utf8(buf).map_err(|err| Error::SourceMapNotUtf8 { err })?;
                    Ok((code, Some(map)))
                } else {
                    Ok((code, None))
                }
            })
    }

    fn complete(
        self,
        mut cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        match result {
            Ok((code, map)) => {
                let code = cx.string(&code);
                let map = map.map(|map| cx.string(&map));

                let obj = cx.empty_object();
                obj.set(&mut cx, "code", code)?;
                if let Some(map) = map {
                    obj.set(&mut cx, "map", map)?;
                }
                Ok(obj.upcast())
            }
            Err(err) => cx.throw_error(err.to_string()),
        }
    }
}

fn compiler_transform_async(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
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

        TransformAsync {
            c: c.clone(),
            fm,
            options,
        }
        .schedule(callback);
    };

    Ok(cx.undefined().upcast())
}

fn compiler_transform_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let source = cx.argument::<JsString>(0)?;
    let options: Options = match cx.argument_opt(1) {
        Some(v) => neon_serde::from_value(&mut cx, v)?,
        None => {
            let obj = cx.empty_object().upcast();
            neon_serde::from_value(&mut cx, obj)?
        }
    };

    let this = cx.this();
    let (code, map) = {
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

    let code = cx.string(&code);

    let obj = cx.empty_object();
    obj.set(&mut cx, "code", code)?;
    if let Some(map) = map {
        let mut buf = vec![];
        map.to_writer(&mut buf)
            .map_err(|err| Error::FailedToWriteSourceMap { err })
            .unwrap();
        let map = cx.string(
            &String::from_utf8(buf)
                .map_err(|err| Error::SourceMapNotUtf8 { err })
                .unwrap(),
        );
        obj.set(&mut cx, "map", map)?;
    }

    Ok(obj.upcast())
}

fn compiler_transform_file_async(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
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
        let fm =
            c.cm.load_file(path)
                .map_err(|err| Error::FailedToReadModule { err })
                .expect("failed to load file");;

        TransformAsync {
            c: c.clone(),
            fm,
            options,
        }
        .schedule(callback);
    };

    Ok(cx.undefined().upcast())
}

fn compiler_transform_file_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
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
    let (code, map) = {
        let guard = cx.lock();
        let c = this.borrow(&guard);
        let fm = c.cm.load_file(path).expect("failed to load file");
        c.process_js_file(fm, opts)
            .expect("failed to process js file")
    };

    let code = cx.string(&code);

    let obj = cx.empty_object();
    obj.set(&mut cx, "code", code)?;
    if let Some(map) = map {
        let mut buf = vec![];
        map.to_writer(&mut buf).expect("failed to write sourcemap");
        let map =
            cx.string(&String::from_utf8(buf).expect("failed to write sourcemap: invalid utf8"));
        obj.set(&mut cx, "map", map)?;
    }

    Ok(obj.upcast())
}

pub type ArcCompiler = Arc<Compiler>;

declare_types! {
    pub class JsCompiler for ArcCompiler {
        init(cx) {
            compiler_init(cx)
        }

        method transform(cx) {
            compiler_transform_async(cx)
        }

        method transformSync(cx) {
            compiler_transform_sync(cx)
        }

        method transformFile(cx) {
            compiler_transform_file_async(cx)
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
