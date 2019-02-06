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

    #[fail(display = "failed to emit module: {}", err)]
    FailedToEmitModule { err: io::Error },

    #[fail(display = "failed to write sourcemap: {}", err)]
    FailedToWriteSourceMap { err: sourcemap::Error },

    #[fail(display = "failed to write sourcemap: {}", err)]
    SourceMapNotUtf8 { err: FromUtf8Error },
}
