#!/bin/bash

####################
# Usage
#
# build.sh $node_version $abi_version
#
# e.g. build.sh 11 67
####################
set -e

if [[ "$TRAVIS_OS_NAME" != "windows" ]]; then source ~/.nvm/nvm.sh ; fi

# Bypasses https://github.com/neon-bindings/neon/issues/384
echo 'Removing old files'

if [[ -z "$APPVEYOR" ]] && [[ "$TRAVIS_OS_NAME" != "windows" ]] ; then
    echo 'Mac os / linux works without hack'
else
    echo "Deleting artifacts.json"
    rm -rf ./native/artifacts.json
fi

rm -rf ./native/index.node \
    ./native/target/release/libffi.d* \
    ./native/target/release/ffi.d* \
    ./native/target/release/build/ffi* \
    ./native/target/release/.fingerprint/neon* \
    ./native/target/release/deps/ffi* \
    ./native/target/release/deps/libffi* \
    ./native/target/release/deps/neon* \
    ./native/target/release/deps/libneon*
echo 'Removed old files'

export PATH="/c/nvm-root:/c/nodejs:$PATH"


if [[ "$TRAVIS_OS_NAME" == "osx" ]] || [[ "$TRAVIS_OS_NAME" == "linux" ]]; then source ~/.nvm/nvm.sh ; fi


echo "Switching to node v$1 ($2)"
nvm use $1

# if [[ "$TRAVIS_OS_NAME" == "windows" ]]; then ls -al '/c/nodejs' ; fi
# if [[ "$TRAVIS_OS_NAME" == "windows" ]]; then ls -alL '/c/nodejs' ; fi
which node && node --version
which npm


export RUSTFLAGS='--cfg procmacro2_semver_exempt --cfg parallel_queries' 
if [[ "$TRAVIS_OS_NAME" == "linux" ]]; then
    rustup target add x86_64-unknown-linux-musl
    export CARGO_BUILD_TARGET="x86_64-unknown-linux-musl"
    export RUSTFLAGS="$RUSTFLAGS -C target-feature=-crt-static"
fi


# (cd native && cargo build --release --verbose)
echo 'Installing deps...'
npm install --ignore-scripts

# Build it
echo 'Building...'
npx neon build --release 

ls -al ./native/target/release

ls -al ./native/target/release/deps

ls -al ./native/target/release/build

# Verify abi
echo 'Verifying binding with jest...'
npx jest __tests__/import_test.js


mv native/index.node $SWC_NAME-$2.node
ls -al .
