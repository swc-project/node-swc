#!/bin/bash

####################
# Usage
#
# build.sh $node_version $abi_version
#
# e.g. build.sh 11 67
####################
set -e

cd swc

echo 'Installing deps...'
npm install --ignore-scripts
npx tsc -d
# Build it
echo 'Building...'
npx neon build --release 

# Verify abi
echo 'Verifying binding with jest...'
npx jest node-swc/__tests__/import_test.js

strip -s native/index.node

mv native/index.node linux_musl-x64-$1.node
ls -al .
