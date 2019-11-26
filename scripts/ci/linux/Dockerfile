ARG NODE_VERSION
FROM alpine:3.10

RUN apk add --no-cache wget build-base musl-dev

RUN wget https://sh.rustup.rs | sh -s -- --default-toolchain nightly --profile minimal -y
RUN ln -s "${HOME}"/.cargo/bin/* /usr/local/bin

# hack to get dynlibs working with musl
# https://github.com/rust-lang/rust/pull/55163#issuecomment-436631090
ENV RUSTFLAGS="-C target-feature=-crt-static --cfg procmacro2_semver_exempt -Z thinlto=no"
ENV CARGO_INCREMENTAL=0

RUN apk add --no-cache node=$NODE_VERSION

CMD ["sh"] 