#!/usr/bin/env bash

set -eu

# Current version we are publising
SEMVER=$(cat swc/package.json | jq -r '.version')
# Last version published
LAST_VER=$(npm view @swc/core version)

echo "@swc/core: ${LAST_VER} => ${SEMVER}"
VER="v$SEMVER"

# Prevent me from tagging without comitting first.
git add -A || true
git commit || true

git push

git tag -d $VER || true
git push origin :$VER || true

git tag $VER
git push --tags