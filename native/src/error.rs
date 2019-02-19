use failure::Fail;
use serde_json;
use sourcemap;
use std::{io, string::FromUtf8Error};

#[derive(Debug, Fail)]
pub(crate) enum Error {
    #[fail(display = "failed to read config file: {}", err)]
    FailedToReadConfigFile { err: io::Error },

    #[fail(display = "failed to parse config file: {}", err)]
    FailedToParseConfigFile { err: serde_json::error::Error },

    #[fail(display = "failed to parse module")]
    FailedToParseModule {},

    #[fail(display = "failed to read module: {}", err)]
    FailedToReadModule { err: io::Error },

    #[fail(display = "failed to emit module: {}", err)]
    FailedToEmitModule { err: io::Error },

    #[fail(display = "failed to write sourcemap: {}", err)]
    FailedToWriteSourceMap { err: sourcemap::Error },

    #[fail(display = "sourcemap is not utf8: {}", err)]
    SourceMapNotUtf8 { err: FromUtf8Error },

    #[fail(display = "code is not utf8: {}", err)]
    CodeNotUtf8 { err: FromUtf8Error },
}
