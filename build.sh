#!/bin/bash
set -euo pipefail

# expects prepare.sh to have been called first

EMSCRIPTEN_VERSION=4.0.14

mkdir -p dist

# https://github.com/nodejs/node/issues/43064
# https://github.com/nodejs/node/issues/53919
docker run \
  --rm \
  -v $(pwd):$(pwd):rw \
  --security-opt seccomp=unconfined \
  emscripten/emsdk:$EMSCRIPTEN_VERSION \
  emcc $(pwd)/src/wrapper/wrapper.c $(pwd)/oniguruma/src/.libs/libonig.a -I$(pwd)/oniguruma/src/ \
  -O3 \
  -s EXPORT_NAME=OnigModule \
  -s MODULARIZE=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web \
  -s EXPORTED_FUNCTIONS='["_match_all","_get_last_error_message","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","UTF8ToString","stringToUTF8"]' \
  -o $(pwd)/dist/onig.js

cp ./src/index.html ./dist/
cp ./src/style.css ./dist/
cp ./src/playground.js ./dist/
cp ./src/test.html ./dist/
cp ./src/test.js ./dist/

cd ./dist/

#python3 -m http.server
