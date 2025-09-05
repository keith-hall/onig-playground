pushd oniguruma
autoreconf -vfi
emconfigure ./configure
emmake make
popd
