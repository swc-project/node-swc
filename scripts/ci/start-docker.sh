#!/bin/sh

# Starts our build image inside docker, if we're doing a docker build.

set -ex

docker build -t node-rust -f "scripts/ci/linux/Dockerfile" .

# sleep so our detached container with no long running process sits around to accept commands for a bit
docker run --detach --name target -v "$(pwd)":/src -w /src node-rust sleep 999999999