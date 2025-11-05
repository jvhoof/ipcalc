/**
 * Template Loader for Web/Vite
 * Uses dynamic imports with ?raw suffix
 * Delegates processing to core templateProcessor module
 */

import {
  type TemplateData,
  processAzureCLITemplate,
  processAzureTerraformTemplate,
  processAzureBicepTemplate,
  processAzureARMTemplate,
  processAzurePowerShellTemplate,
  processAWSCLITemplate,
  processAWSTerraformTemplate,
  processAWSCloudFormationTemplate,
  processGCPGcloudTemplate,
  processGCPTerraformTemplate,
  processOracleOCITemplate,
  processOracleTerraformTemplate,
  processAliCloudAliyunTemplate,
  processAliCloudTerraformTemplate
} from './templateProcessor'

// Re-export for backwards compatibility
export type { TemplateData } from './templateProcessor'

/**
 * Load and process Azure CLI template
 */
export async function loadAzureCLITemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/cli.template.sh?raw')
  return processAzureCLITemplate(template.default, data)
}

/**
 * Load and process Azure Terraform template
 */
export async function loadAzureTerraformTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/terraform.template.tf?raw')
  return processAzureTerraformTemplate(template.default, data)
}

/**
 * Load and process Azure Bicep template
 */
export async function loadAzureBicepTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/bicep.template.bicep?raw')
  return processAzureBicepTemplate(template.default, data)
}

/**
 * Load and process Azure ARM template
 */
export async function loadAzureARMTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/arm.template.json?raw')
  return processAzureARMTemplate(template.default, data)
}

/**
 * Load and process Azure PowerShell template
 */
export async function loadAzurePowerShellTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/powershell.template.ps1?raw')
  return processAzurePowerShellTemplate(template.default, data)
}

// ============================================
// AWS Template Loaders
// ============================================

/**
 * Load and process AWS CLI template
 */
export async function loadAWSCLITemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/aws/cli.template.sh?raw')
  return processAWSCLITemplate(template.default, data)
}

/**
 * Load and process AWS Terraform template
 */
export async function loadAWSTerraformTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/aws/terraform.template.tf?raw')
  return processAWSTerraformTemplate(template.default, data)
}

/**
 * Load and process AWS CloudFormation template
 */
export async function loadAWSCloudFormationTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/aws/cloudformation.template.yaml?raw')
  return processAWSCloudFormationTemplate(template.default, data)
}

// ============================================
// GCP Template Loaders
// ============================================

/**
 * Load and process GCP gcloud CLI template
 */
export async function loadGCPGcloudTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/gcp/gcloud.template.sh?raw')
  return processGCPGcloudTemplate(template.default, data)
}

/**
 * Load and process GCP Terraform template
 */
export async function loadGCPTerraformTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/gcp/terraform.template.tf?raw')
  return processGCPTerraformTemplate(template.default, data)
}

// ============================================
// Oracle Cloud Template Loaders
// ============================================

/**
 * Load and process Oracle OCI CLI template
 */
export async function loadOracleOCITemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/oracle/oci.template.sh?raw')
  return processOracleOCITemplate(template.default, data)
}

/**
 * Load and process Oracle Terraform template
 */
export async function loadOracleTerraformTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/oracle/terraform.template.tf?raw')
  return processOracleTerraformTemplate(template.default, data)
}

/**
 * Load and process AliCloud Aliyun CLI template
 */
export async function loadAliCloudAliyunTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/alicloud/aliyun.template.sh?raw')
  return processAliCloudAliyunTemplate(template.default, data)
}

/**
 * Load and process AliCloud Terraform template
 */
export async function loadAliCloudTerraformTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/alicloud/terraform.template.tf?raw')
  return processAliCloudTerraformTemplate(template.default, data)
}
