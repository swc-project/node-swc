ARG IMAGE
FROM ${IMAGE}

RUN apk add --no-cache wget build-base musl-dev python2

RUN wget https://sh.rustup.rs -O - | sh -s -- --default-toolchain nightly --profile minimal -y
RUN ln -s "${HOME}"/.cargo/bin/* /usr/local/bin

ENV CARGO_INCREMENTAL=0

CMD ["sh"] 