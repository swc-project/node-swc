#![feature(box_syntax)]
#![feature(box_patterns)]
#![feature(specialization)]
#![recursion_limit = "2048"]

extern crate failure;
extern crate fxhash;
extern crate hashbrown;
extern crate lazy_static;
extern crate neon;
extern crate neon_serde;
extern crate path_clean;
extern crate serde;
extern crate swc;

use neon::prelude::*;
use path_clean::clean;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use swc::{
    common::{
        self, comments::Comments, errors::Handler, FileName, FilePathMapping, Fold, SourceFile,
        SourceMap, Spanned,
    },
    config::{Options, ParseOptions},
    ecmascript::ast::Module,
    error::Error,
    Compiler, TransformOutput,
};

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

/// Input to transform
#[derive(Debug)]
enum Input {
    /// json string
    Module(String),
    /// Raw source code.
    Source(Arc<SourceFile>),
}

struct TransformTask {
    c: Arc<Compiler>,
    input: Input,
    options: Options,
    hook: Option<EventHandler>,
}

struct TransformFileTask {
    c: Arc<Compiler>,
    path: PathBuf,
    options: Options,
    hook: Option<EventHandler>,
}

fn complete_output<'a>(
    mut cx: impl Context<'a>,
    result: Result<TransformOutput, Error>,
) -> JsResult<'a, JsValue> {
    match result {
        Ok(output) => Ok(neon_serde::to_value(&mut cx, &output)?),
        Err(err) => cx.throw_error(err.to_string()),
    }
}

struct Hook<'a> {
    c: Arc<Compiler>,
    hook: Option<&'a EventHandler>,
}

impl Fold<Module> for Hook<'_> {
    fn fold(&mut self, m: Module) -> Module {
        if let Some(hook) = self.hook.take() {
            let c = self.c.clone();

            let module = m.clone();
            hook.schedule_with(move |cx, this, callback| {
                c.run(|| {
                    let args: Vec<Handle<JsValue>> = vec![neon_serde::to_value(cx, &module)
                        .expect("failed to serialize module")
                        .upcast()];
                    let result = callback.call(cx, this, args);

                    // TODO: parse module
                    // let cmd = match result {
                    //     Ok(v) => {
                    //         if let Ok(number) = v.downcast::<JsNumber>() {
                    //             if number.value() == 12f64 {
                    //                 "done".into()
                    //             } else {
                    //                 "wrong number".into()
                    //             }
                    //         } else {
                    //             "no number returned".into()
                    //         }
                    //     }
                    //     Err(e) => format!("threw {}", e),
                    // };
                    // let args: Vec<Handle<JsValue>> =
                    // vec![cx.string(cmd).upcast()];
                    // let _result = callback.call(cx, this, args);
                })
            })
        }

        m
    }
}

fn process_js(
    c: &Arc<Compiler>,
    fm: Arc<SourceFile>,
    hook: Option<&EventHandler>,
    opts: &Options,
) -> Result<TransformOutput, Error> {
    let config = c.run(|| c.config_for_file(opts, &*fm))?;

    c.process_js(fm, Hook { c: c.clone(), hook }, config)
}

impl Task for TransformTask {
    type Output = TransformOutput;
    type Error = Error;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        match self.input {
            Input::Module(ref s) => {
                let m: Module = serde_json::from_str(&s).expect("failed to deserialize Module");
                let loc = self.c.cm.lookup_char_pos(m.span().lo());
                let fm = loc.file;
                print_js(&self.c, &Default::default(), &m, fm, false, false)
            }
            Input::Source(ref s) => {
                process_js(&self.c, s.clone(), self.hook.as_ref(), &self.options)
            }
        }
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        complete_output(cx, result)
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

        process_js(&self.c, fm, self.hook.as_ref(), &self.options)
    }

    fn complete(
        self,
        cx: TaskContext,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        complete_output(cx, result)
    }
}

/// returns `compiler, (src / path), options, plugin, callback`
fn schedule_transform<F, T>(mut cx: MethodContext<JsCompiler>, op: F) -> JsResult<JsValue>
where
    F: FnOnce(&Arc<Compiler>, String, bool, Option<EventHandler>, Options) -> T,
    T: Task,
{
    let c;
    let this = cx.this();
    {
        let guard = cx.lock();
        c = this.borrow(&guard).clone();
    };

    let s = cx.argument::<JsString>(0)?.value();
    let is_module = cx.argument::<JsBoolean>(1)?;
    let options_arg = cx.argument::<JsValue>(2)?;

    // let hook = match cx.argument::<JsUndefined>(3) {
    //     Ok(..) => None,
    //     Err(..) => Some(EventHandler::bind(this, cx.argument::<JsFunction>(2)?)),
    // };
    let hook = None;

    let options: Options = neon_serde::from_value(&mut cx, options_arg)?;
    let callback = cx.argument::<JsFunction>(4)?;

    let task = op(&c, s, is_module.value(), hook, options);
    task.schedule(callback);

    Ok(cx.undefined().upcast())
}

fn exec_transform<F>(mut cx: MethodContext<JsCompiler>, op: F) -> JsResult<JsValue>
where
    F: FnOnce(&Compiler, String, &Options) -> Result<Arc<SourceFile>, Error>,
{
    let s = cx.argument::<JsString>(0)?;
    let is_module = cx.argument::<JsBoolean>(1)?;
    let options: Options = match cx.argument_opt(2) {
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
        if is_module.value() {
            let m: Module = serde_json::from_str(&s.value()).expect("failed to deserialize Module");
            let loc = c.cm.lookup_char_pos(m.span().lo());
            let fm = loc.file;
            print_js(&c, &Default::default(), &m, fm, false, false)
        } else {
            let fm = op(&c, s.value(), &options).expect("failed to create fm");
            process_js(&c, fm, None, &options)
        }
    };

    complete_output(cx, output)
}

fn transform(cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    schedule_transform(cx, |c, src, is_module, hook, options| {
        let input = if is_module {
            Input::Module(src)
        } else {
            Input::Source(c.cm.new_source_file(
                if options.filename.is_empty() {
                    FileName::Anon
                } else {
                    FileName::Real(options.filename.clone().into())
                },
                src,
            ))
        };

        TransformTask {
            c: c.clone(),
            input,
            hook,
            options,
        }
    })
}

fn transform_sync(cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    exec_transform(cx, |c, src, options| {
        Ok(c.cm.new_source_file(
            if options.filename.is_empty() {
                FileName::Anon
            } else {
                FileName::Real(options.filename.clone().into())
            },
            src,
        ))
    })
}

fn transform_file(cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    schedule_transform(cx, |c, path, _, hook, options| {
        let path = clean(&path);

        TransformFileTask {
            c: c.clone(),
            path: path.into(),
            hook,
            options,
        }
    })
}

fn transform_file_sync(cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    exec_transform(cx, |c, path, _| {
        Ok(c.cm
            .load_file(Path::new(&path))
            .expect("failed to load file"))
    })
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

fn complete_parse<'a>(
    mut cx: impl Context<'a>,
    result: Result<Module, Error>,
    c: &Compiler,
) -> JsResult<'a, JsValue> {
    c.run(|| match result {
        Ok(module) => Ok(cx
            .string(serde_json::to_string(&module).expect("failed to serialize Module"))
            .upcast()),
        Err(err) => cx.throw_error(err.to_string()),
    })
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
        complete_parse(cx, result, &self.c)
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
        complete_parse(cx, result, &self.c)
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
    let c;
    let this = cx.this();
    {
        let guard = cx.lock();
        let compiler = this.borrow(&guard);
        c = compiler.clone();
    }
    c.run(|| {
        let src = cx.argument::<JsString>(0)?;
        let options_arg = cx.argument::<JsValue>(1)?;
        let options: ParseOptions = neon_serde::from_value(&mut cx, options_arg)?;

        let module = {
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

        complete_parse(cx, module, &c)
    })
}

fn parse_file_sync(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let c;
    let this = cx.this();
    {
        let guard = cx.lock();
        let compiler = this.borrow(&guard);
        c = compiler.clone();
    }
    c.run(|| {
        let path = cx.argument::<JsString>(0)?;
        let options_arg = cx.argument::<JsValue>(1)?;
        let options: ParseOptions = neon_serde::from_value(&mut cx, options_arg)?;

        let module = {
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

        complete_parse(cx, module, &c)
    })
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
        let loc = self.c.cm.lookup_char_pos(self.module.span().lo());
        let fm = loc.file;
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
        complete_output(cx, result)
    }
}

fn print(mut cx: MethodContext<JsCompiler>) -> JsResult<JsValue> {
    let module = cx.argument::<JsString>(0)?;
    let module: Module =
        serde_json::from_str(&module.value()).expect("failed to deserialize Module");

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
    let c;
    let this = cx.this();
    {
        let guard = cx.lock();
        let compiler = this.borrow(&guard);
        c = compiler.clone();
    }
    c.run(|| {
        let module = cx.argument::<JsString>(0)?;
        let module: Module =
            serde_json::from_str(&module.value()).expect("failed to deserialize Module");

        let options = cx.argument::<JsValue>(1)?;
        let options: Options = neon_serde::from_value(&mut cx, options)?;

        let result = {
            let loc = c.cm.lookup_char_pos(module.span().lo());
            let fm = loc.file;
            let comments = Default::default();
            c.print(
                &module,
                fm,
                &comments,
                options.source_maps.is_some(),
                options.config.unwrap_or_default().minify.unwrap_or(false),
            )
        };
        complete_output(cx, result)
    })
}

fn print_js(
    c: &Compiler,
    comments: &Comments,
    module: &Module,
    fm: Arc<SourceFile>,
    source_map: bool,
    minify: bool,
) -> Result<TransformOutput, Error> {
    c.print(&module, fm, comments, source_map, minify)
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
