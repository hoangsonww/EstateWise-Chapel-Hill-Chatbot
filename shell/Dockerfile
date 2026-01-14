# Tooling container for development and CI workflows
FROM node:18-bullseye

ARG TERRAFORM_VERSION=1.6.6
ARG AWSCLI_VERSION=2.15.3
ARG USER=dev
ARG UID=1000
ARG GID=1000

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    jq \
    make \
    openssh-client \
    unzip \
  && rm -rf /var/lib/apt/lists/*

RUN arch="$(uname -m)" \
  && case "$arch" in \
    aarch64|arm64) tf_arch="arm64"; aws_arch="aarch64" ;; \
    x86_64) tf_arch="amd64"; aws_arch="x86_64" ;; \
    *) echo "Unsupported architecture: $arch"; exit 1 ;; \
  esac \
  && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${tf_arch}.zip" -o /tmp/terraform.zip \
  && unzip /tmp/terraform.zip -d /usr/local/bin \
  && rm -f /tmp/terraform.zip \
  && curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${aws_arch}-${AWSCLI_VERSION}.zip" -o /tmp/awscliv2.zip \
  && unzip /tmp/awscliv2.zip -d /tmp \
  && /tmp/aws/install \
  && rm -rf /tmp/aws /tmp/awscliv2.zip

RUN npm install -g npm@latest concurrently

RUN groupadd -g ${GID} ${USER} \
  && useradd -m -u ${UID} -g ${GID} -s /bin/bash ${USER}

USER ${USER}

EXPOSE 3000 3001
CMD ["bash"]
