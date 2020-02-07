#!/usr/bin/env bash

(cd native && cargo update)
(cd wasm && cargo update)