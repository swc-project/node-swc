#!/bin/bash

####################
# Usage
#
# build.sh $node_version $abi_version
#
# e.g. build.sh 11 67
####################
set -e

which node && node --version
which npm


# (cd native && cargo build --release --verbose)
echo 'Installing deps...'
npm install --ignore-scripts

# Build it
echo 'Building...'
npx neon build --release 

# Verify abi
echo 'Verifying binding with jest...'
npx jest __tests__/import_test.js


mv native/index.node $SWC_NAME-$1.node
ls -al .
