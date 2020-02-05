use once_cell::sync::Lazy;
use std::sync::Arc;
use swc::{
    common,
    common::{errors::Handler, FileName, FilePathMapping, SourceMap},
    config::Options,
    Compiler,
};
use wasm_bindgen::prelude::*;

static COMPILER: Lazy<Arc<Compiler>> = Lazy::new(|| {
    let cm = Arc::new(SourceMap::new(FilePathMapping::empty()));

    let handler = Handler::with_tty_emitter(
        common::errors::ColorConfig::Always,
        true,
        false,
        Some(cm.clone()),
    );

    let c = Compiler::new(cm.clone(), handler);

    Arc::new(c)
});

#[wasm_bindgen]
pub fn transform(s: &str, opts: JsValue) -> JsValue {
    let opts: Options = opts.into_serde().unwrap();
    let fm = COMPILER.cm.new_source_file(FileName::Anon, s.into());
    let out = COMPILER
        .process_js_file(fm, &opts)
        .expect("failed to process");

    JsValue::from_serde(&out).unwrap()
}
