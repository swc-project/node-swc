#!/usr/bin/env bash

set -eu

git push

git tag -d $1 || true
git push origin :$1 || true

git tag $1
git push --tags