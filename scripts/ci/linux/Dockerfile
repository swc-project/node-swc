FROM centos:7

RUN wget https://sh.rustup.rs -O - | sh -s -- --default-toolchain nightly --profile minimal -y
RUN ln -s "${HOME}"/.cargo/bin/* /usr/local/bin

ENV CARGO_INCREMENTAL=0


RUN yum -y update; yum clean all
RUN yum -y install epel-release; yum clean all

ARG NODE_VERSION
RUN curl -sL https://rpm.nodesource.com/setup_${NODE_VERSION} | sudo bash -
RUN yum -y install nodejs; yum clean all

CMD ["sh"] 