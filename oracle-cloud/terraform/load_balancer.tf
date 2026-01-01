resource "oci_load_balancer_load_balancer" "app" {
  count          = var.enable_load_balancer ? 1 : 0
  compartment_id = var.compartment_ocid
  display_name   = "estatewise-lb"
  shape          = "flexible"

  subnet_ids = [oci_core_subnet.public.id]

  is_private = false

  network_security_group_ids = [oci_core_network_security_group.lb_nsg.id]

  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 100
  }
}

resource "oci_load_balancer_backend_set" "backend" {
  count            = var.enable_load_balancer ? 1 : 0
  name             = "estatewise-backend-set"
  load_balancer_id = oci_load_balancer_load_balancer.app[0].id
  policy           = "ROUND_ROBIN"

  health_checker {
    protocol = "HTTP"
    port     = var.backend_port
    url_path = "/status"
    interval_in_millis = 10000
    timeout_in_millis  = 3000
    retries            = 3
  }
}

resource "oci_load_balancer_backend" "backend" {
  count            = var.enable_load_balancer ? 1 : 0
  load_balancer_id = oci_load_balancer_load_balancer.app[0].id
  backendset_name  = oci_load_balancer_backend_set.backend[0].name
  ip_address       = oci_core_instance.app.private_ip
  port             = var.backend_port
  weight           = 1
}

resource "oci_load_balancer_listener" "http" {
  count                    = var.enable_load_balancer ? 1 : 0
  load_balancer_id         = oci_load_balancer_load_balancer.app[0].id
  name                     = "http"
  default_backend_set_name = oci_load_balancer_backend_set.backend[0].name
  port                     = 80
  protocol                 = "HTTP"
}

resource "oci_load_balancer_certificate" "tls" {
  count            = var.enable_load_balancer && var.tls_certificate_path != "" && var.tls_private_key_path != "" ? 1 : 0
  load_balancer_id = oci_load_balancer_load_balancer.app[0].id
  certificate_name = "estatewise-tls"
  public_certificate = file(var.tls_certificate_path)
  private_key        = file(var.tls_private_key_path)
  ca_certificate     = var.tls_ca_certificate_path != "" ? file(var.tls_ca_certificate_path) : null
}

resource "oci_load_balancer_listener" "https" {
  count                    = var.enable_load_balancer && var.tls_certificate_path != "" && var.tls_private_key_path != "" ? 1 : 0
  load_balancer_id         = oci_load_balancer_load_balancer.app[0].id
  name                     = "https"
  default_backend_set_name = oci_load_balancer_backend_set.backend[0].name
  port                     = 443
  protocol                 = "HTTP"

  ssl_configuration {
    certificate_name        = oci_load_balancer_certificate.tls[0].certificate_name
    verify_peer_certificate = false
  }
}
