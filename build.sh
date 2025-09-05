#!/bin/sh
# expects prepare.sh to have been called first
# TODO: set pipefail etc.

pushd ./emsdk
./emsdk activate latest
source ./emsdk_env.sh
popd

# emcc ./src/.libs/libonig.a \                                               
#   -I./src \   
#   -s EXPORTED_FUNCTIONS='["_onig_new", "_onig_free", "_onig_search", "_onig_match", "_onig_error_code_to_str"]' \
#   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
#   -o onig.js   
 
# emcc ../src/wrapper/wrapper.c ./src/.libs/libonig.a -I./src \
#   -s EXPORTED_FUNCTIONS='["_match_all"]' \
#   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue"]' \
#   -s EXPORT_NAME=OnigModule \
#   -o onig.js

# emcc ../src/wrapper/wrapper.c ./src/.libs/libonig.a -I./src \
#   -s EXPORTED_FUNCTIONS='["_match_all", "_malloc", "_free"]' \
#   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue"]' \
#   -s EXPORT_NAME=OnigModule \
#   -o onig.js

cd oniguruma
emcc ../src/wrapper/wrapper.c ./src/.libs/libonig.a -I./src \
  -O3 \
  -s EXPORT_NAME=OnigModule \
  -s MODULARIZE=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web \
  -s EXPORTED_FUNCTIONS='["_match_all","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","UTF8ToString","stringToUTF8"]' \
  -o onig.js


cp onig.js ../dist/
cp onig.wasm ../dist/
cp ../src/index.html ../dist/
cp ../src/style.css ../dist/

cd ../dist/
python3 -m http.server

