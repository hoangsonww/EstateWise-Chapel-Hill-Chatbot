variable "tenancy_ocid" {
  type        = string
  description = "OCI tenancy OCID"
}

variable "user_ocid" {
  type        = string
  description = "OCI user OCID"
}

variable "fingerprint" {
  type        = string
  description = "OCI API key fingerprint"
}

variable "private_key_path" {
  type        = string
  description = "Path to OCI API private key"
}

variable "region" {
  type        = string
  description = "OCI region (e.g., us-ashburn-1)"
}

variable "compartment_ocid" {
  type        = string
  description = "OCI compartment OCID"
}

variable "availability_domain" {
  type        = string
  description = "Availability domain name (optional; defaults to first)"
  default     = ""
}

variable "ssh_authorized_keys" {
  type        = string
  description = "SSH public keys for instance access"
}

variable "vcn_cidr" {
  type        = string
  description = "VCN CIDR"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  type        = string
  description = "Public subnet CIDR"
  default     = "10.0.10.0/24"
}

variable "private_subnet_cidr" {
  type        = string
  description = "Private subnet CIDR"
  default     = "10.0.20.0/24"
}

variable "instance_shape" {
  type        = string
  description = "Compute instance shape"
  default     = "VM.Standard.E4.Flex"
}

variable "instance_ocpus" {
  type        = number
  description = "OCPU count for flex shapes"
  default     = 2
}

variable "instance_memory_gbs" {
  type        = number
  description = "Memory (GB) for flex shapes"
  default     = 16
}

variable "boot_volume_size_gbs" {
  type        = number
  description = "Boot volume size in GB"
  default     = 50
}

variable "instance_in_private_subnet" {
  type        = bool
  description = "Whether to place compute instance in private subnet"
  default     = true
}

variable "enable_load_balancer" {
  type        = bool
  description = "Enable OCI load balancer"
  default     = true
}

variable "backend_port" {
  type        = number
  description = "Backend service port"
  default     = 3001
}

variable "agentic_port" {
  type        = number
  description = "Agentic AI service port"
  default     = 4318
}

variable "backend_image" {
  type        = string
  description = "OCIR backend image URI"
}

variable "agentic_image" {
  type        = string
  description = "OCIR agentic-ai image URI"
}

variable "ocir_registry" {
  type        = string
  description = "OCIR registry hostname (e.g., iad.ocir.io)"
  default     = ""
}

variable "ocir_username" {
  type        = string
  description = "OCIR username (tenancy/user or tenancy/namespace/user)"
  default     = ""
}

variable "ocir_auth_token" {
  type        = string
  description = "OCIR auth token for registry login"
  sensitive   = true
  default     = ""
}

variable "mongo_uri" {
  type        = string
  description = "MongoDB connection string"
}

variable "jwt_secret" {
  type        = string
  description = "JWT secret"
  sensitive   = true
}

variable "google_ai_api_key" {
  type        = string
  description = "Google AI API key"
  sensitive   = true
}

variable "pinecone_api_key" {
  type        = string
  description = "Pinecone API key"
  sensitive   = true
}

variable "pinecone_index" {
  type        = string
  description = "Pinecone index name"
  default     = "estatewise-index"
}

variable "neo4j_enable" {
  type        = string
  description = "Enable Neo4j integration"
  default     = "false"
}

variable "neo4j_uri" {
  type        = string
  description = "Neo4j connection URI"
  default     = ""
}

variable "neo4j_username" {
  type        = string
  description = "Neo4j username"
  default     = ""
}

variable "neo4j_password" {
  type        = string
  description = "Neo4j password"
  sensitive   = true
  default     = ""
}

variable "neo4j_database" {
  type        = string
  description = "Neo4j database"
  default     = "neo4j"
}

variable "openai_api_key" {
  type        = string
  description = "OpenAI API key (optional for agentic-ai)"
  sensitive   = true
  default     = ""
}

variable "tls_certificate_path" {
  type        = string
  description = "Path to TLS certificate PEM for LB (optional)"
  default     = ""
}

variable "tls_private_key_path" {
  type        = string
  description = "Path to TLS private key PEM for LB (optional)"
  default     = ""
}

variable "tls_ca_certificate_path" {
  type        = string
  description = "Path to TLS CA certificate PEM for LB (optional)"
  default     = ""
}

variable "admin_cidr" {
  type        = string
  description = "CIDR allowed to SSH to the instance (only used if instance has public IP)"
  default     = "0.0.0.0/0"
}
