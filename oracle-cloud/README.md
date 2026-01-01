# Oracle Cloud (OCI) Deployment

This directory contains a production-ready Oracle Cloud Infrastructure (OCI) deployment for EstateWise using Terraform, OCI Container Registry (OCIR), and a hardened compute instance running Docker Compose. The design mirrors the existing multi-cloud deployments (AWS/Azure/GCP) and is intended for production use.

## Architecture

- **OCI VCN** with public/private subnets, Internet Gateway, NAT Gateway, and route tables.
- **OCI Load Balancer** (optional but recommended) terminating HTTP/HTTPS.
- **Compute instance** (Oracle Linux/Ubuntu) running:
  - `backend` API container
  - `agentic-ai` HTTP server container (optional via Docker Compose profiles)
- **Network Security Groups (NSGs)** for least-privilege access.
- **OCI Container Registry (OCIR)** for production image hosting.

```
Internet
  │
  ├─ (Optional) OCI Load Balancer → Backend service (3001)
  │
  └─ OCI VCN
       ├─ Public Subnet (LB)
       └─ Private Subnet (Compute)
```

## Prerequisites

- OCI tenancy + compartment
- OCI API key and config (`~/.oci/config` or env vars)
- Terraform >= 1.5
- Docker installed locally to build/push images
- OCIR repository for your tenancy

## Build & Push Images to OCIR

```bash
# Login to OCIR
export OCI_TENANCY_NAMESPACE="<tenancy-namespace>"
export OCI_REGION="<region>"
export OCI_USER="<oracle-cloud-username>"

# Example: iad.ocir.io/<namespace>/estatewise-backend:latest
./oracle-cloud/scripts/push-images.sh \
  --region "$OCI_REGION" \
  --namespace "$OCI_TENANCY_NAMESPACE" \
  --backend-repo estatewise-backend \
  --agentic-repo estatewise-agentic \
  --tag latest
```

## OCIR Pull Credentials on Compute

The compute instance must authenticate to OCIR to pull images. Provide the following in `terraform.tfvars`:

- `ocir_registry` (e.g., `iad.ocir.io`)
- `ocir_username` (tenancy/username or tenancy/namespace/username)
- `ocir_auth_token` (OCI auth token)

Terraform injects these into cloud-init and runs a `docker login` before starting services.

## Terraform Deploy

1. Copy the example variables file and fill in your values.

```bash
cp oracle-cloud/terraform/terraform.tfvars.example oracle-cloud/terraform/terraform.tfvars
```

2. Initialize and apply:

```bash
cd oracle-cloud/terraform
terraform init
terraform apply
```

## Updating Runtime Configuration

The compute instance provisions `/opt/estatewise/.env` and `/opt/estatewise/docker-compose.yml` from Terraform templates. After updating `terraform.tfvars`, run:

```bash
cd oracle-cloud/terraform
terraform apply
```

Terraform will re-run cloud-init on first boot only. For updates, SSH into the instance and run:

```bash
sudo /opt/estatewise/scripts/update-env.sh
sudo docker compose -f /opt/estatewise/docker-compose.yml up -d
```

## HTTPS / TLS

To enable HTTPS on the OCI Load Balancer:

1. Provide `tls_certificate_path`, `tls_private_key_path`, and optional `tls_ca_certificate_path` in `terraform.tfvars`.
2. The Terraform stack will provision a TLS listener on port 443.

## Production Notes

- Use a flex shape sized for your workload (default: `VM.Standard.E4.Flex`, 2 OCPU / 16 GB RAM).
- Keep the load balancer enabled for TLS termination and stable ingress.
- Store secrets in OCI Vault and inject via environment at deploy time if your compliance posture requires it.

## File Layout

```
oracle-cloud/
├── README.md
├── docker/
│   ├── agentic.Dockerfile
│   └── backend.Dockerfile
├── scripts/
│   └── push-images.sh
├── templates/
│   ├── cloud-init.yaml.tmpl
│   ├── docker-compose.yaml.tmpl
│   └── env.tmpl
└── terraform/
    ├── compute.tf
    ├── load_balancer.tf
    ├── networking.tf
    ├── outputs.tf
    ├── providers.tf
    ├── security.tf
    ├── terraform.tfvars.example
    └── variables.tf
```
