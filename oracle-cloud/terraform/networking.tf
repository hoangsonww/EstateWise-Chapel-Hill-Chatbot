data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

locals {
  availability_domain = var.availability_domain != "" ? var.availability_domain : data.oci_identity_availability_domains.ads.availability_domains[0].name
}

resource "oci_core_vcn" "this" {
  compartment_id = var.compartment_ocid
  cidr_block     = var.vcn_cidr
  display_name   = "estatewise-vcn"
  dns_label      = "estatewise"
}

resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "estatewise-igw"
  enabled        = true
}

resource "oci_core_nat_gateway" "nat" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "estatewise-nat"
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "estatewise-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}

resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "estatewise-private-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.nat.id
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.this.id
  cidr_block        = var.public_subnet_cidr
  display_name      = "estatewise-public"
  route_table_id    = oci_core_route_table.public.id
  dns_label         = "public"
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_subnet" "private" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.this.id
  cidr_block        = var.private_subnet_cidr
  display_name      = "estatewise-private"
  route_table_id    = oci_core_route_table.private.id
  dns_label         = "private"
  prohibit_public_ip_on_vnic = true
}
