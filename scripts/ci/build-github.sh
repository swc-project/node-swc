#!/bin/bash

####################
# Usage
#
# build.sh $node_version $abi_version
#
# e.g. build.sh 11 67
####################
set -e

cd ./swc

# Bypasses https://github.com/neon-bindings/neon/issues/384
echo 'Removing old files'

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     SWC_NAME=linux-x64;;
    Darwin*)    SWC_NAME=darwin-x64;;
    CYGWIN*)    SWC_NAME=win32-x64;;
    MSYS*)      SWC_NAME=win32-x64;;
    MINGW*)     SWC_NAME=win32-x64;;
    *)          SWC_NAME="UNKNOWN:${unameOut}"
esac
echo $SWC_NAME

rm -rf ./native/index.node \
    ./target/release/libffi.d* \
    ./target/release/ffi.d* \
    ./target/release/build/ffi* \
    ./target/release/.fingerprint/neon* \
    ./target/release/deps/ffi* \
    ./target/release/deps/libffi* \
    ./target/release/deps/neon* \
    ./target/release/deps/libneon*
echo 'Removed old files'

# if [[ "$TRAVIS_OS_NAME" == "windows" ]]; then ls -al '/c/nodejs' ; fi
# if [[ "$TRAVIS_OS_NAME" == "windows" ]]; then ls -alL '/c/nodejs' ; fi
which node && node --version
which npm


# (cd native && cargo build --release --verbose)
echo 'Installing deps...'
npm install --ignore-scripts
npx tsc -d

# Build it
echo 'Building...'
npx neon build --release

ls -al ./target/release

# Verify abi
echo 'Verifying binding with jest...'
npx jest node-swc/__tests__/import_test.js


mv native/index.node $SWC_NAME-$2.node
ls -al .
