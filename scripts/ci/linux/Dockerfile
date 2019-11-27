FROM centos:7

RUN wget https://sh.rustup.rs -O - | sh -s -- --default-toolchain nightly --profile minimal -y
RUN ln -s "${HOME}"/.cargo/bin/* /usr/local/bin

ENV CARGO_INCREMENTAL=0


RUN yum -y update; yum clean all
RUN yum -y install epel-release; yum clean all

ARG NODE_VERSION
RUN yum -y install nodejs@$NODE_VERSION npm@$NODE_VERSION; yum clean all

CMD ["sh"] 