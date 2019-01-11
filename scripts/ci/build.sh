#!/bin/bash

####################
# Usage
#
# build.sh $node_version $abi_version
#
# e.g. build.sh 11 67
####################
set -eu

# Bypasses https://github.com/neon-bindings/neon/issues/384
echo 'Removing old files'
rm -rf ./native/index.node \
    ./native/target/release/libffi.d* \
    ./native/target/release/.fingerprint/neon* \
    ./native/target/release/deps/libffi* \
    ./native/target/release/deps/neon-* \
    ./native/target/release/deps/libneon-*
echo 'Removed old files'


if [[ "$TRAVIS_OS_NAME" != "windows" ]]; then source ~/.nvm/nvm.sh ; fi


echo "Switching to node v$1 ($2)"
nvm use $1


echo 'Installing deps...'
npm install --ignore-scripts
echo 'Installing neon...'
npm install -g neon-cli

# Build it
echo 'Building...'
neon build --release

# Verify abi
echo 'Verifying binding with jest...'
npm install -g jest
jest


mv native/index.node $SWC_NAME-$2.node

