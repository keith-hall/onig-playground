#!/bin/sh
set -euo pipefail

git submodule update --init

pushd oniguruma

EMSCRIPTEN_VERSION=4.0.14

# TODO: only skip if already configured

autoreconf -vfi

#-u $(id -u):$(id -g)

echo 'running configure...'
docker run \
  --rm \
  -v $(pwd):$(pwd):rw \
  -w $(pwd) \
  emscripten/emsdk:$EMSCRIPTEN_VERSION \
  emconfigure $(pwd)/configure

#-u $(id -u):$(id -g)

echo 'running make...'
docker run \
  --rm \
  -v $(pwd):$(pwd):rw \
  -w $(pwd) \
  emscripten/emsdk:$EMSCRIPTEN_VERSION \
  emmake make

echo 'preparations done'
popd
