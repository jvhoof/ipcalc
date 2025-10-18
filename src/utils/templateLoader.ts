/**
 * Template Loader Utility
 * Loads and processes IaC templates from separate files
 */

interface Subnet {
  network: string
  cidr: string
  mask: string
  totalIPs: number
  usableIPs: number
  reserved: string[]
  usableRange: string
}

interface TemplateData {
  vnetCidr: string
  subnets: Subnet[]
}

/**
 * Load and process Azure CLI template
 */
export async function loadAzureCLITemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/cli.template.sh?raw')
  let content = template.default

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += `SUBNET${index + 1}_NAME="\${PREFIX}-subnet${index + 1}"\n`
    subnetVariables += `SUBNET${index + 1}_CIDR="${subnet.cidr}"\n`
  })

  // Generate subnet creation commands
  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += `echo "Creating Subnet ${index + 1}: \${SUBNET${index + 1}_NAME}"\n`
    subnetCreation += `az network vnet subnet create \\\n`
    subnetCreation += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
    subnetCreation += `  --vnet-name "\${VNET_NAME}" \\\n`
    subnetCreation += `  --name "\${SUBNET${index + 1}_NAME}" \\\n`
    subnetCreation += `  --address-prefix "\${SUBNET${index + 1}_CIDR}"\n\n`
  })

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

/**
 * Load and process Azure Terraform template
 */
export async function loadAzureTerraformTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/terraform.template.tf?raw')
  let content = template.default

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += `\nvariable "subnet${index + 1}_cidr" {\n`
    subnetVariables += `  description = "CIDR block for Subnet ${index + 1}"\n`
    subnetVariables += `  type        = string\n`
    subnetVariables += `  default     = "${subnet.cidr}"\n`
    subnetVariables += `}\n`
  })

  // Generate subnet resources
  let subnetResources = ''
  data.subnets.forEach((subnet, index) => {
    subnetResources += `resource "azurerm_subnet" "subnet${index + 1}" {\n`
    subnetResources += `  name                 = "\${var.prefix}-subnet${index + 1}"\n`
    subnetResources += `  resource_group_name  = azurerm_resource_group.main.name\n`
    subnetResources += `  virtual_network_name = azurerm_virtual_network.main.name\n`
    subnetResources += `  address_prefixes     = [var.subnet${index + 1}_cidr]\n`
    subnetResources += `}\n\n`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `\noutput "subnet${index + 1}_id" {\n`
    subnetOutputs += `  description = "ID of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = azurerm_subnet.subnet${index + 1}.id\n`
    subnetOutputs += `}\n`
  })

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Load and process Azure Bicep template
 */
export async function loadAzureBicepTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/bicep.template.bicep?raw')
  let content = template.default

  // Generate subnet parameters
  let subnetParameters = ''
  data.subnets.forEach((subnet, index) => {
    subnetParameters += `\n@description('CIDR block for Subnet ${index + 1}')\n`
    subnetParameters += `param subnet${index + 1}Cidr string = '${subnet.cidr}'\n`
  })

  // Generate subnet definitions
  let subnetDefinitions = ''
  data.subnets.forEach((subnet, index) => {
    subnetDefinitions += `      {\n`
    subnetDefinitions += `        name: '\${prefix}-subnet${index + 1}'\n`
    subnetDefinitions += `        properties: {\n`
    subnetDefinitions += `          addressPrefix: subnet${index + 1}Cidr\n`
    subnetDefinitions += `        }\n`
    subnetDefinitions += `      }\n`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `\n@description('ID of Subnet ${index + 1}')\n`
    subnetOutputs += `output subnet${index + 1}Id string = vnet.properties.subnets[${index}].id\n`
  })

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetDefinitions}}', subnetDefinitions)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Load and process Azure ARM template
 */
export async function loadAzureARMTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/arm.template.json?raw')
  let content = template.default

  // Generate subnet parameters
  let subnetParameters = ''
  data.subnets.forEach((subnet, index) => {
    subnetParameters += `,\n    "subnet${index + 1}Cidr": {\n`
    subnetParameters += `      "type": "string",\n`
    subnetParameters += `      "defaultValue": "${subnet.cidr}",\n`
    subnetParameters += `      "metadata": {\n`
    subnetParameters += `        "description": "CIDR block for Subnet ${index + 1}"\n`
    subnetParameters += `      }\n`
    subnetParameters += `    }`
  })

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += `,\n    "subnet${index + 1}Name": "[concat(parameters('prefix'), '-subnet${index + 1}')]"`
  })

  // Generate subnet definitions
  let subnetDefinitions = ''
  data.subnets.forEach((subnet, index) => {
    if (index > 0) subnetDefinitions += ','
    subnetDefinitions += `\n          {\n`
    subnetDefinitions += `            "name": "[variables('subnet${index + 1}Name')]",\n`
    subnetDefinitions += `            "properties": {\n`
    subnetDefinitions += `              "addressPrefix": "[parameters('subnet${index + 1}Cidr')]"\n`
    subnetDefinitions += `            }\n`
    subnetDefinitions += `          }`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `,\n    "subnet${index + 1}Id": {\n`
    subnetOutputs += `      "type": "string",\n`
    subnetOutputs += `      "value": "[resourceId('Microsoft.Network/virtualNetworks/subnets', variables('vnetName'), variables('subnet${index + 1}Name'))]",\n`
    subnetOutputs += `      "metadata": {\n`
    subnetOutputs += `        "description": "Resource ID of Subnet ${index + 1}"\n`
    subnetOutputs += `      }\n`
    subnetOutputs += `    }`
  })

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetDefinitions}}', subnetDefinitions)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Load and process Azure PowerShell template
 */
export async function loadAzurePowerShellTemplate(data: TemplateData): Promise<string> {
  const template = await import('../templates/azure/powershell.template.ps1?raw')
  let content = template.default

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += `$Subnet${index + 1}Name = "\${Prefix}-subnet${index + 1}"\n`
    subnetVariables += `$Subnet${index + 1}Cidr = "${subnet.cidr}"\n`
  })

  // Generate subnet configurations
  let subnetConfigurations = ''
  data.subnets.forEach((subnet, index) => {
    subnetConfigurations += `$SubnetConfig${index + 1} = New-AzVirtualNetworkSubnetConfig \`\n`
    subnetConfigurations += `    -Name $Subnet${index + 1}Name \`\n`
    subnetConfigurations += `    -AddressPrefix $Subnet${index + 1}Cidr\n`
    subnetConfigurations += `Write-Host "  - Subnet ${index + 1}: $Subnet${index + 1}Name ($Subnet${index + 1}Cidr)" -ForegroundColor Gray\n\n`
  })

  // Generate subnet config list
  const subnetConfigList = data.subnets.map((_, index) => `$SubnetConfig${index + 1}`).join(', ')

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetConfigurations}}', subnetConfigurations)
  content = content.replace('{{subnetConfigList}}', subnetConfigList)

  return content
}
