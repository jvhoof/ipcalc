# Terraform Configuration for Oracle Cloud OIDC with GitHub Actions
# This template sets up OpenID Connect (OIDC) authentication for GitHub Actions
# Generated template for ipcalc.cloud

# ========================================
# Provider Configuration
# ========================================

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  # Configure authentication via environment variables or config file
  # OCI_TENANCY_OCID, OCI_USER_OCID, OCI_FINGERPRINT, OCI_PRIVATE_KEY_PATH
  # or use profile-based authentication
}

# ========================================
# Variables
# ========================================

variable "tenancy_ocid" {
  description = "OCI Tenancy OCID"
  type        = string
}

variable "compartment_ocid" {
  description = "OCI Compartment OCID where resources will be managed"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org prefix)"
  type        = string
  default     = ""
}

variable "use_org_wide_access" {
  description = "If true, grants access to all repositories in the organization. If false, restricts to specific repository."
  type        = bool
  default     = false
}

variable "identity_provider_name" {
  description = "Name of the Identity Provider"
  type        = string
  default     = "GitHubActionsProvider"
}

variable "dynamic_group_name" {
  description = "Name of the Dynamic Group"
  type        = string
  default     = "github-actions-dg"
}

variable "policy_name" {
  description = "Name of the IAM Policy"
  type        = string
  default     = "github-actions-policy"
}

variable "restrict_to_branch" {
  description = "Optional: Restrict access to a specific git ref (e.g., 'refs/heads/main'). Leave empty for all branches."
  type        = string
  default     = ""
}

variable "additional_policy_statements" {
  description = "Additional policy statements to grant the Dynamic Group"
  type        = list(string)
  default     = []
}

# ========================================
# Data Sources
# ========================================

data "oci_identity_tenancy" "tenancy" {
  tenancy_id = var.tenancy_ocid
}

# ========================================
# Identity Provider
# ========================================

resource "oci_identity_identity_provider" "github_actions" {
  compartment_id = var.tenancy_ocid
  name           = var.identity_provider_name
  description    = "Identity Provider for GitHub Actions OIDC"
  product_type   = "OIDC"
  protocol       = "SAML2"

  metadata_url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"

  freeform_tags = {
    "ManagedBy" = "Terraform"
    "Purpose"   = "GitHubActions"
  }
}

# ========================================
# Dynamic Group
# ========================================

locals {
  # Base matching rule conditions
  base_conditions = [
    "resource.type='workloadidentityprincipal'",
    "resource.compartment.id='${var.compartment_ocid}'",
    "workload.iss='https://token.actions.githubusercontent.com'"
  ]

  # Repository condition - either specific repo or org-wide
  repo_condition = var.use_org_wide_access ? [
    "workload.repository_owner='${var.github_org}'"
  ] : [
    "workload.repository='${var.github_org}/${var.github_repo}'"
  ]

  # Optional branch restriction
  branch_condition = var.restrict_to_branch != "" ? [
    "workload.ref='${var.restrict_to_branch}'"
  ] : []

  # Combine all conditions
  all_conditions = concat(
    local.base_conditions,
    local.repo_condition,
    local.branch_condition
  )

  # Create matching rule with ALL conditions
  matching_rule = "ALL {${join(", ", local.all_conditions)}}"
}

resource "oci_identity_dynamic_group" "github_actions" {
  compartment_id = var.tenancy_ocid
  name           = var.dynamic_group_name
  description    = "Dynamic Group for GitHub Actions - ${var.use_org_wide_access ? "org: ${var.github_org}" : "repo: ${var.github_org}/${var.github_repo}"}"
  matching_rule  = local.matching_rule

  freeform_tags = {
    "ManagedBy" = "Terraform"
    "Purpose"   = "GitHubActions"
  }
}

# ========================================
# IAM Policy
# ========================================

locals {
  # Default policy statements for managing infrastructure
  default_policy_statements = [
    "Allow dynamic-group ${oci_identity_dynamic_group.github_actions.name} to manage virtual-network-family in compartment id ${var.compartment_ocid}",
    "Allow dynamic-group ${oci_identity_dynamic_group.github_actions.name} to manage instance-family in compartment id ${var.compartment_ocid}",
    "Allow dynamic-group ${oci_identity_dynamic_group.github_actions.name} to manage volume-family in compartment id ${var.compartment_ocid}",
    "Allow dynamic-group ${oci_identity_dynamic_group.github_actions.name} to inspect compartments in compartment id ${var.compartment_ocid}",
  ]

  # Combine default and additional statements
  all_policy_statements = concat(
    local.default_policy_statements,
    var.additional_policy_statements
  )
}

resource "oci_identity_policy" "github_actions" {
  compartment_id = var.compartment_ocid
  name           = var.policy_name
  description    = "Policy for GitHub Actions Dynamic Group"
  statements     = local.all_policy_statements

  freeform_tags = {
    "ManagedBy" = "Terraform"
    "Purpose"   = "GitHubActions"
  }
}

# ========================================
# Outputs
# ========================================

output "identity_provider_id" {
  description = "OCID of the Identity Provider"
  value       = oci_identity_identity_provider.github_actions.id
}

output "identity_provider_name" {
  description = "Name of the Identity Provider"
  value       = oci_identity_identity_provider.github_actions.name
}

output "dynamic_group_id" {
  description = "OCID of the Dynamic Group"
  value       = oci_identity_dynamic_group.github_actions.id
}

output "dynamic_group_name" {
  description = "Name of the Dynamic Group"
  value       = oci_identity_dynamic_group.github_actions.name
}

output "dynamic_group_matching_rule" {
  description = "Matching rule for the Dynamic Group"
  value       = oci_identity_dynamic_group.github_actions.matching_rule
}

output "policy_id" {
  description = "OCID of the IAM Policy"
  value       = oci_identity_policy.github_actions.id
}

output "policy_name" {
  description = "Name of the IAM Policy"
  value       = oci_identity_policy.github_actions.name
}

output "github_secrets_summary" {
  description = "Summary of values to add as GitHub repository secrets"
  value = {
    OCI_TENANCY_OCID            = var.tenancy_ocid
    OCI_COMPARTMENT_OCID        = var.compartment_ocid
    OCI_IDENTITY_PROVIDER_OCID  = oci_identity_identity_provider.github_actions.id
    OCI_REGION                  = "Set your preferred region (e.g., us-phoenix-1)"
  }
}

output "workflow_configuration_hint" {
  description = "Hints for configuring GitHub Actions workflow"
  value = <<-EOT

    Add the following to your GitHub Actions workflow:

    permissions:
      id-token: write
      contents: read

    steps:
      - name: Authenticate to Oracle Cloud
        uses: oracle-actions/configure-oci-cli@v1
        with:
          tenancy: ${{ secrets.OCI_TENANCY_OCID }}
          region: ${{ secrets.OCI_REGION }}
          auth-type: 'workload-identity'
          workload-identity-provider: ${{ secrets.OCI_IDENTITY_PROVIDER_OCID }}
  EOT
}
