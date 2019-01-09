#![feature(box_syntax)]
#![feature(box_patterns)]

#[macro_use]
extern crate neon;
extern crate neon_serde;
extern crate serde;
extern crate sourcemap;
extern crate swc;

use neon::prelude::*;
use std::{path::Path, sync::Arc};
use swc::config::{Config, TrnasformConfig};
use swc::{
    common::{
        self, errors::Handler, sync::Lrc, FileName, FilePathMapping, Fold, FoldWith, SourceMap,
    },
    ecmascript::{
        ast::Module,
        codegen,
        transforms::{compat, fixer, helpers, hygiene, react, simplifier, typescript},
    },
    Compiler,
};

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
    let options: Option<Config> = match cx.argument_opt(1) {
        Some(v) => Some(neon_serde::from_value(&mut cx, v)?),
        None => None,
    };

    let path_value = path.value();
    let path = Path::new(&path_value);
    let syntax = options.as_ref().map(|c| c.jsc.syntax);

    let this = cx.this();
    let (code, map) = {
        let guard = cx.lock();
        let c = this.borrow(&guard);

        let config = options
            .map(Arc::new)
            .unwrap_or_else(|| c.config_for_file(path).expect("failed to load .swcrc file"));
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
