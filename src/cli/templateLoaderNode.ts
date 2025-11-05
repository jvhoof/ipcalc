/**
 * Template Loader for Node.js CLI
 * Uses fs.readFileSync for synchronous file loading
 * Delegates processing to core templateProcessor module
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
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
} from '../utils/templateProcessor'

// Re-export for backwards compatibility
export type { TemplateData } from '../utils/templateProcessor'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadTemplate(relativePath: string): string {
  const templatePath = join(__dirname, '..', 'templates', relativePath)
  return readFileSync(templatePath, 'utf-8')
}

/**
 * Azure CLI Template
 */
export function loadAzureCLITemplate(data: TemplateData): string {
  return processAzureCLITemplate(loadTemplate('azure/cli.template.sh'), data)
}

/**
 * Azure Terraform Template
 */
export function loadAzureTerraformTemplate(data: TemplateData): string {
  return processAzureTerraformTemplate(loadTemplate('azure/terraform.template.tf'), data)
}

/**
 * Azure Bicep Template
 */
export function loadAzureBicepTemplate(data: TemplateData): string {
  return processAzureBicepTemplate(loadTemplate('azure/bicep.template.bicep'), data)
}

/**
 * Azure ARM Template
 */
export function loadAzureARMTemplate(data: TemplateData): string {
  return processAzureARMTemplate(loadTemplate('azure/arm.template.json'), data)
}

/**
 * Azure PowerShell Template
 */
export function loadAzurePowerShellTemplate(data: TemplateData): string {
  return processAzurePowerShellTemplate(loadTemplate('azure/powershell.template.ps1'), data)
}

// AWS Templates
export function loadAWSCLITemplate(data: TemplateData): string {
  return processAWSCLITemplate(loadTemplate('aws/cli.template.sh'), data)
}

export function loadAWSTerraformTemplate(data: TemplateData): string {
  return processAWSTerraformTemplate(loadTemplate('aws/terraform.template.tf'), data)
}

export function loadAWSCloudFormationTemplate(data: TemplateData): string {
  return processAWSCloudFormationTemplate(loadTemplate('aws/cloudformation.template.yaml'), data)
}

// GCP Templates
export function loadGCPGcloudTemplate(data: TemplateData): string {
  return processGCPGcloudTemplate(loadTemplate('gcp/gcloud.template.sh'), data)
}

export function loadGCPTerraformTemplate(data: TemplateData): string {
  return processGCPTerraformTemplate(loadTemplate('gcp/terraform.template.tf'), data)
}

// Oracle Templates
export function loadOracleOCITemplate(data: TemplateData): string {
  return processOracleOCITemplate(loadTemplate('oracle/oci.template.sh'), data)
}

export function loadOracleTerraformTemplate(data: TemplateData): string {
  return processOracleTerraformTemplate(loadTemplate('oracle/terraform.template.tf'), data)
}

// AliCloud Templates
export function loadAliCloudAliyunTemplate(data: TemplateData): string {
  return processAliCloudAliyunTemplate(loadTemplate('alicloud/aliyun.template.sh'), data)
}

export function loadAliCloudTerraformTemplate(data: TemplateData): string {
  return processAliCloudTerraformTemplate(loadTemplate('alicloud/terraform.template.tf'), data)
}
