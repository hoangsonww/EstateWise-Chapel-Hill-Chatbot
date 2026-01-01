resource "oci_core_network_security_group" "app_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "estatewise-app-nsg"
}

resource "oci_core_network_security_group" "lb_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "estatewise-lb-nsg"
}

resource "oci_core_network_security_group_security_rule" "app_from_lb_backend" {
  network_security_group_id = oci_core_network_security_group.app_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.lb_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = var.backend_port
      max = var.backend_port
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_from_lb_agentic" {
  network_security_group_id = oci_core_network_security_group.app_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.lb_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = var.agentic_port
      max = var.agentic_port
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_public_backend" {
  count                     = var.enable_load_balancer || var.instance_in_private_subnet ? 0 : 1
  network_security_group_id = oci_core_network_security_group.app_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = var.backend_port
      max = var.backend_port
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_public_agentic" {
  count                     = var.enable_load_balancer || var.instance_in_private_subnet ? 0 : 1
  network_security_group_id = oci_core_network_security_group.app_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = var.agentic_port
      max = var.agentic_port
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_egress" {
  network_security_group_id = oci_core_network_security_group.app_nsg.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

resource "oci_core_network_security_group_security_rule" "lb_http" {
  network_security_group_id = oci_core_network_security_group.lb_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_https" {
  count                     = var.tls_certificate_path != "" && var.tls_private_key_path != "" ? 1 : 0
  network_security_group_id = oci_core_network_security_group.lb_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_egress" {
  network_security_group_id = oci_core_network_security_group.lb_nsg.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

resource "oci_core_network_security_group_security_rule" "ssh_ingress" {
  count                     = var.instance_in_private_subnet ? 0 : 1
  network_security_group_id = oci_core_network_security_group.app_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.admin_cidr
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}
