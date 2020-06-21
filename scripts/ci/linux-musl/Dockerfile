ARG NODE_VERSION

FROM node:${NODE_VERSION}-alpine3.10

ENV CARGO_INCREMENTAL=0

# Install rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain nightly --profile minimal -y
RUN ln -s "${HOME}"/.cargo/bin/* /usr/bin


CMD ["sh"] 
