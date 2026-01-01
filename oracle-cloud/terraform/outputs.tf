output "instance_private_ip" {
  value       = oci_core_instance.app.private_ip
  description = "Private IP of the compute instance"
}

output "instance_public_ip" {
  value       = oci_core_instance.app.public_ip
  description = "Public IP of the compute instance (if assigned)"
}

output "load_balancer_ip" {
  value       = var.enable_load_balancer ? oci_load_balancer_load_balancer.app[0].ip_address_details[0].ip_address : null
  description = "Public IP of the OCI Load Balancer"
}
