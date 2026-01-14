# Terraform runner with AWS CLI v2
FROM public.ecr.aws/aws-cli/aws-cli:2.15.3

ARG TERRAFORM_VERSION=1.6.6
ARG USER=terraform
ARG UID=1000
ARG GID=1000

WORKDIR /workspace

RUN yum install -y \
    curl \
    unzip \
    jq \
    tar \
    gzip \
  && arch="$(uname -m)" \
  && case "$arch" in \
    aarch64|arm64) tf_arch="arm64" ;; \
    x86_64) tf_arch="amd64" ;; \
    *) echo "Unsupported architecture: $arch"; exit 1 ;; \
  esac \
  && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${tf_arch}.zip" -o /tmp/terraform.zip \
  && unzip /tmp/terraform.zip -d /usr/local/bin \
  && rm -f /tmp/terraform.zip \
  && yum clean all

RUN groupadd -g ${GID} ${USER} \
  && useradd -m -u ${UID} -g ${GID} -s /bin/bash ${USER}

USER ${USER}

ENTRYPOINT ["terraform"]
CMD ["-help"]
