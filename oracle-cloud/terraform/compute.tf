data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

locals {
  docker_compose = templatefile("${path.module}/../templates/docker-compose.yaml.tmpl", {
    backend_image = var.backend_image
    agentic_image = var.agentic_image
    backend_port  = var.backend_port
    agentic_port  = var.agentic_port
  })

  env_file = templatefile("${path.module}/../templates/env.tmpl", {
    backend_port       = var.backend_port
    agentic_port       = var.agentic_port
    mongo_uri          = var.mongo_uri
    jwt_secret         = var.jwt_secret
    google_ai_api_key  = var.google_ai_api_key
    pinecone_api_key   = var.pinecone_api_key
    pinecone_index     = var.pinecone_index
    neo4j_enable       = var.neo4j_enable
    neo4j_uri          = var.neo4j_uri
    neo4j_username     = var.neo4j_username
    neo4j_password     = var.neo4j_password
    neo4j_database     = var.neo4j_database
    openai_api_key     = var.openai_api_key
  })

  cloud_init = templatefile("${path.module}/../templates/cloud-init.yaml.tmpl", {
    docker_compose = indent(4, local.docker_compose)
    env_file       = indent(4, local.env_file)
    ocir_registry  = var.ocir_registry
    ocir_username  = var.ocir_username
    ocir_auth_token = var.ocir_auth_token
  })
}

resource "oci_core_instance" "app" {
  availability_domain = local.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "estatewise-app"
  shape               = var.instance_shape

  dynamic "shape_config" {
    for_each = length(regexall("Flex$", var.instance_shape)) > 0 ? [1] : []
    content {
      ocpus         = var.instance_ocpus
      memory_in_gbs = var.instance_memory_gbs
    }
  }

  create_vnic_details {
    subnet_id        = var.instance_in_private_subnet ? oci_core_subnet.private.id : oci_core_subnet.public.id
    assign_public_ip = var.instance_in_private_subnet ? false : true
    nsg_ids          = [oci_core_network_security_group.app_nsg.id]
  }

  metadata = {
    ssh_authorized_keys = var.ssh_authorized_keys
    user_data           = base64encode(local.cloud_init)
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu.images[0].id

    boot_volume_size_in_gbs = var.boot_volume_size_gbs
  }
}
