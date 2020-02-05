#!/usr/bin/env bash

(cd wasm && wasm-pack build --scope @swc/wasm -t nodejs)