/**
 * Core Template Processor
 * Contains all shared template generation logic
 * Platform-agnostic - no I/O dependencies
 */

export interface Subnet {
  network: string
  cidr: string
  mask: string
  totalIPs: number
  usableIPs: number
  reserved: string[]
  usableRange: string
  availabilityZone?: string
  region?: string
  availabilityDomain?: string
  zone?: string
}

export interface SpokeVNet {
  cidr: string
  numberOfSubnets: number
  vnetInfo: {
    network: string
    totalIPs: number
    firstIP: string
    lastIP: string
  } | null
  subnets: Subnet[]
  error: string
}

export interface TemplateData {
  vnetCidr: string
  subnets: Subnet[]
  peeringEnabled?: boolean
  spokeVNets?: SpokeVNet[]
  spokeVPCs?: any[]  // GCP spoke VPCs (same structure as spokeVNets)
}

// ============================================
// Azure Template Processors
// ============================================

/**
 * Process Azure CLI template
 */
export function processAzureCLITemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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

  // Generate spoke VNET variables
  let spokeVnetVariables = ''
  let spokeVnetCreation = ''
  let vnetPeering = ''

  if (data.peeringEnabled && data.spokeVNets && data.spokeVNets.length > 0) {
    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1
      const spokeName = `\${PREFIX}-spoke${spokeNum}-vnet`

      // Spoke VNET variables
      spokeVnetVariables += `SPOKE${spokeNum}_VNET_NAME="${spokeName}"\n`
      spokeVnetVariables += `SPOKE${spokeNum}_VNET_CIDR="${spoke.cidr}"\n`

      // Spoke subnet variables
      spoke.subnets.forEach((subnet, subnetIndex) => {
        spokeVnetVariables += `SPOKE${spokeNum}_SUBNET${subnetIndex + 1}_NAME="${spokeName}-subnet${subnetIndex + 1}"\n`
        spokeVnetVariables += `SPOKE${spokeNum}_SUBNET${subnetIndex + 1}_CIDR="${subnet.cidr}"\n`
      })
      spokeVnetVariables += '\n'
    })

    // Spoke VNET creation section
    spokeVnetCreation += '\n# ========================================\n'
    spokeVnetCreation += '# Create Spoke VNets\n'
    spokeVnetCreation += '# ========================================\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      spokeVnetCreation += `\necho "Creating Spoke VNET ${spokeNum}: \${SPOKE${spokeNum}_VNET_NAME}"\n`
      spokeVnetCreation += `az network vnet create \\\n`
      spokeVnetCreation += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
      spokeVnetCreation += `  --name "\${SPOKE${spokeNum}_VNET_NAME}" \\\n`
      spokeVnetCreation += `  --address-prefix "\${SPOKE${spokeNum}_VNET_CIDR}" \\\n`
      spokeVnetCreation += `  --location "\${LOCATION}"\n\n`

      // Create subnets for spoke VNET
      spoke.subnets.forEach((subnet, subnetIndex) => {
        spokeVnetCreation += `echo "Creating Spoke ${spokeNum} Subnet ${subnetIndex + 1}: \${SPOKE${spokeNum}_SUBNET${subnetIndex + 1}_NAME}"\n`
        spokeVnetCreation += `az network vnet subnet create \\\n`
        spokeVnetCreation += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
        spokeVnetCreation += `  --vnet-name "\${SPOKE${spokeNum}_VNET_NAME}" \\\n`
        spokeVnetCreation += `  --name "\${SPOKE${spokeNum}_SUBNET${subnetIndex + 1}_NAME}" \\\n`
        spokeVnetCreation += `  --address-prefix "\${SPOKE${spokeNum}_SUBNET${subnetIndex + 1}_CIDR}"\n\n`
      })
    })

    // VNET Peering section
    vnetPeering += '\n# ========================================\n'
    vnetPeering += '# Create VNET Peering\n'
    vnetPeering += '# ========================================\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Hub to Spoke peering
      vnetPeering += `\necho "Creating peering from Hub to Spoke ${spokeNum}"\n`
      vnetPeering += `az network vnet peering create \\\n`
      vnetPeering += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
      vnetPeering += `  --name "hub-to-spoke${spokeNum}" \\\n`
      vnetPeering += `  --vnet-name "\${VNET_NAME}" \\\n`
      vnetPeering += `  --remote-vnet "\${SPOKE${spokeNum}_VNET_NAME}" \\\n`
      vnetPeering += `  --allow-vnet-access\n\n`

      // Spoke to Hub peering
      vnetPeering += `echo "Creating peering from Spoke ${spokeNum} to Hub"\n`
      vnetPeering += `az network vnet peering create \\\n`
      vnetPeering += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
      vnetPeering += `  --name "spoke${spokeNum}-to-hub" \\\n`
      vnetPeering += `  --vnet-name "\${SPOKE${spokeNum}_VNET_NAME}" \\\n`
      vnetPeering += `  --remote-vnet "\${VNET_NAME}" \\\n`
      vnetPeering += `  --allow-vnet-access\n\n`
    })
  }

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetCreation}}', subnetCreation)
  content = content.replace('{{spokeVnetVariables}}', spokeVnetVariables)
  content = content.replace('{{spokeVnetCreation}}', spokeVnetCreation)
  content = content.replace('{{vnetPeering}}', vnetPeering)

  return content
}

/**
 * Process Azure Terraform template
 */
export function processAzureTerraformTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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
    subnetResources += `  resource_group_name  = azurerm_resource_group.rg.name\n`
    subnetResources += `  virtual_network_name = azurerm_virtual_network.vnet.name\n`
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

  // Generate spoke VNET resources
  let spokeVnetResources = ''
  let vnetPeeringResources = ''
  let spokeVnetOutputs = ''

  if (data.peeringEnabled && data.spokeVNets && data.spokeVNets.length > 0) {
    spokeVnetResources += '\n# ========================================\n'
    spokeVnetResources += '# Spoke VNets\n'
    spokeVnetResources += '# ========================================\n\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Spoke VNET resource
      spokeVnetResources += `resource "azurerm_virtual_network" "spoke${spokeNum}_vnet" {\n`
      spokeVnetResources += `  name                = "\${var.prefix}-spoke${spokeNum}-vnet"\n`
      spokeVnetResources += `  address_space       = ["${spoke.cidr}"]\n`
      spokeVnetResources += `  location            = azurerm_resource_group.rg.location\n`
      spokeVnetResources += `  resource_group_name = azurerm_resource_group.rg.name\n\n`
      spokeVnetResources += `  tags = {\n`
      spokeVnetResources += `    Environment = "Production"\n`
      spokeVnetResources += `    ManagedBy   = "Terraform"\n`
      spokeVnetResources += `    Role        = "Spoke"\n`
      spokeVnetResources += `  }\n`
      spokeVnetResources += `}\n\n`

      // Spoke subnets
      spoke.subnets.forEach((subnet, subnetIndex) => {
        spokeVnetResources += `resource "azurerm_subnet" "spoke${spokeNum}_subnet${subnetIndex + 1}" {\n`
        spokeVnetResources += `  name                 = "\${var.prefix}-spoke${spokeNum}-subnet${subnetIndex + 1}"\n`
        spokeVnetResources += `  resource_group_name  = azurerm_resource_group.rg.name\n`
        spokeVnetResources += `  virtual_network_name = azurerm_virtual_network.spoke${spokeNum}_vnet.name\n`
        spokeVnetResources += `  address_prefixes     = ["${subnet.cidr}"]\n`
        spokeVnetResources += `}\n\n`
      })
    })

    // VNET Peering resources
    vnetPeeringResources += '# ========================================\n'
    vnetPeeringResources += '# VNET Peering\n'
    vnetPeeringResources += '# ========================================\n\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Hub to Spoke peering
      vnetPeeringResources += `resource "azurerm_virtual_network_peering" "hub_to_spoke${spokeNum}" {\n`
      vnetPeeringResources += `  name                      = "hub-to-spoke${spokeNum}"\n`
      vnetPeeringResources += `  resource_group_name       = azurerm_resource_group.rg.name\n`
      vnetPeeringResources += `  virtual_network_name      = azurerm_virtual_network.vnet.name\n`
      vnetPeeringResources += `  remote_virtual_network_id = azurerm_virtual_network.spoke${spokeNum}_vnet.id\n`
      vnetPeeringResources += `  allow_virtual_network_access = true\n`
      vnetPeeringResources += `  allow_forwarded_traffic      = true\n`
      vnetPeeringResources += `  allow_gateway_transit        = false\n`
      vnetPeeringResources += `}\n\n`

      // Spoke to Hub peering
      vnetPeeringResources += `resource "azurerm_virtual_network_peering" "spoke${spokeNum}_to_hub" {\n`
      vnetPeeringResources += `  name                      = "spoke${spokeNum}-to-hub"\n`
      vnetPeeringResources += `  resource_group_name       = azurerm_resource_group.rg.name\n`
      vnetPeeringResources += `  virtual_network_name      = azurerm_virtual_network.spoke${spokeNum}_vnet.name\n`
      vnetPeeringResources += `  remote_virtual_network_id = azurerm_virtual_network.vnet.id\n`
      vnetPeeringResources += `  allow_virtual_network_access = true\n`
      vnetPeeringResources += `  allow_forwarded_traffic      = true\n`
      vnetPeeringResources += `  use_remote_gateways          = false\n`
      vnetPeeringResources += `}\n\n`
    })

    // Spoke VNET outputs
    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      spokeVnetOutputs += `\noutput "spoke${spokeNum}_vnet_id" {\n`
      spokeVnetOutputs += `  description = "ID of Spoke ${spokeNum} Virtual Network"\n`
      spokeVnetOutputs += `  value       = azurerm_virtual_network.spoke${spokeNum}_vnet.id\n`
      spokeVnetOutputs += `}\n`

      spokeVnetOutputs += `\noutput "spoke${spokeNum}_vnet_name" {\n`
      spokeVnetOutputs += `  description = "Name of Spoke ${spokeNum} Virtual Network"\n`
      spokeVnetOutputs += `  value       = azurerm_virtual_network.spoke${spokeNum}_vnet.name\n`
      spokeVnetOutputs += `}\n`
    })
  }

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)
  content = content.replace('{{spokeVnetResources}}', spokeVnetResources)
  content = content.replace('{{vnetPeeringResources}}', vnetPeeringResources)
  content = content.replace('{{spokeVnetOutputs}}', spokeVnetOutputs)

  return content
}

/**
 * Process Azure Bicep template
 */
export function processAzureBicepTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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

  // Generate spoke VNET resources
  let spokeVnetResources = ''
  let vnetPeeringResources = ''
  let spokeVnetOutputs = ''

  if (data.peeringEnabled && data.spokeVNets && data.spokeVNets.length > 0) {
    spokeVnetResources += '\n// ========================================\n'
    spokeVnetResources += '// Spoke VNets\n'
    spokeVnetResources += '// ========================================\n\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Spoke VNET resource
      spokeVnetResources += `resource spoke${spokeNum}Vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {\n`
      spokeVnetResources += `  name: '\${prefix}-spoke${spokeNum}-vnet'\n`
      spokeVnetResources += `  location: location\n`
      spokeVnetResources += `  tags: tags\n`
      spokeVnetResources += `  properties: {\n`
      spokeVnetResources += `    addressSpace: {\n`
      spokeVnetResources += `      addressPrefixes: [\n`
      spokeVnetResources += `        '${spoke.cidr}'\n`
      spokeVnetResources += `      ]\n`
      spokeVnetResources += `    }\n`
      spokeVnetResources += `    subnets: [\n`

      spoke.subnets.forEach((subnet, subnetIndex) => {
        spokeVnetResources += `      {\n`
        spokeVnetResources += `        name: '\${prefix}-spoke${spokeNum}-subnet${subnetIndex + 1}'\n`
        spokeVnetResources += `        properties: {\n`
        spokeVnetResources += `          addressPrefix: '${subnet.cidr}'\n`
        spokeVnetResources += `        }\n`
        spokeVnetResources += `      }\n`
      })

      spokeVnetResources += `    ]\n`
      spokeVnetResources += `  }\n`
      spokeVnetResources += `}\n\n`
    })

    // VNET Peering resources
    vnetPeeringResources += '// ========================================\n'
    vnetPeeringResources += '// VNET Peering\n'
    vnetPeeringResources += '// ========================================\n\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Hub to Spoke peering
      vnetPeeringResources += `resource hubToSpoke${spokeNum}Peering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-05-01' = {\n`
      vnetPeeringResources += `  parent: vnet\n`
      vnetPeeringResources += `  name: 'hub-to-spoke${spokeNum}'\n`
      vnetPeeringResources += `  properties: {\n`
      vnetPeeringResources += `    allowVirtualNetworkAccess: true\n`
      vnetPeeringResources += `    allowForwardedTraffic: true\n`
      vnetPeeringResources += `    allowGatewayTransit: false\n`
      vnetPeeringResources += `    useRemoteGateways: false\n`
      vnetPeeringResources += `    remoteVirtualNetwork: {\n`
      vnetPeeringResources += `      id: spoke${spokeNum}Vnet.id\n`
      vnetPeeringResources += `    }\n`
      vnetPeeringResources += `  }\n`
      vnetPeeringResources += `}\n\n`

      // Spoke to Hub peering
      vnetPeeringResources += `resource spoke${spokeNum}ToHubPeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-05-01' = {\n`
      vnetPeeringResources += `  parent: spoke${spokeNum}Vnet\n`
      vnetPeeringResources += `  name: 'spoke${spokeNum}-to-hub'\n`
      vnetPeeringResources += `  properties: {\n`
      vnetPeeringResources += `    allowVirtualNetworkAccess: true\n`
      vnetPeeringResources += `    allowForwardedTraffic: true\n`
      vnetPeeringResources += `    allowGatewayTransit: false\n`
      vnetPeeringResources += `    useRemoteGateways: false\n`
      vnetPeeringResources += `    remoteVirtualNetwork: {\n`
      vnetPeeringResources += `      id: vnet.id\n`
      vnetPeeringResources += `    }\n`
      vnetPeeringResources += `  }\n`
      vnetPeeringResources += `}\n\n`
    })

    // Spoke VNET outputs
    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      spokeVnetOutputs += `\n@description('ID of Spoke ${spokeNum} Virtual Network')\n`
      spokeVnetOutputs += `output spoke${spokeNum}VnetId string = spoke${spokeNum}Vnet.id\n`

      spokeVnetOutputs += `\n@description('Name of Spoke ${spokeNum} Virtual Network')\n`
      spokeVnetOutputs += `output spoke${spokeNum}VnetName string = spoke${spokeNum}Vnet.name\n`
    })
  }

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetDefinitions}}', subnetDefinitions)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)
  content = content.replace('{{spokeVnetResources}}', spokeVnetResources)
  content = content.replace('{{vnetPeeringResources}}', vnetPeeringResources)
  content = content.replace('{{spokeVnetOutputs}}', spokeVnetOutputs)

  return content
}

/**
 * Process Azure ARM template
 */
export function processAzureARMTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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

  // Generate spoke VNET resources
  let spokeVnetVariables = ''
  let spokeVnetResources = ''
  let vnetPeeringResources = ''
  let spokeVnetOutputs = ''

  if (data.peeringEnabled && data.spokeVNets && data.spokeVNets.length > 0) {
    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Spoke VNET variables
      spokeVnetVariables += `,\n    "spoke${spokeNum}VnetName": "[concat(parameters('prefix'), '-spoke${spokeNum}-vnet')]"`

      // Spoke VNET resource
      spokeVnetResources += `,\n    {\n`
      spokeVnetResources += `      "type": "Microsoft.Network/virtualNetworks",\n`
      spokeVnetResources += `      "apiVersion": "2025-01-01",\n`
      spokeVnetResources += `      "name": "[variables('spoke${spokeNum}VnetName')]",\n`
      spokeVnetResources += `      "location": "[parameters('location')]",\n`
      spokeVnetResources += `      "tags": {\n`
      spokeVnetResources += `        "Environment": "Production",\n`
      spokeVnetResources += `        "ManagedBy": "ARM Template",\n`
      spokeVnetResources += `        "Role": "Spoke"\n`
      spokeVnetResources += `      },\n`
      spokeVnetResources += `      "properties": {\n`
      spokeVnetResources += `        "addressSpace": {\n`
      spokeVnetResources += `          "addressPrefixes": [\n`
      spokeVnetResources += `            "${spoke.cidr}"\n`
      spokeVnetResources += `          ]\n`
      spokeVnetResources += `        },\n`
      spokeVnetResources += `        "subnets": [\n`

      spoke.subnets.forEach((subnet, subnetIndex) => {
        if (subnetIndex > 0) spokeVnetResources += ','
        spokeVnetResources += `\n          {\n`
        spokeVnetResources += `            "name": "[concat(variables('spoke${spokeNum}VnetName'), '-subnet${subnetIndex + 1}')]",\n`
        spokeVnetResources += `            "properties": {\n`
        spokeVnetResources += `              "addressPrefix": "${subnet.cidr}"\n`
        spokeVnetResources += `            }\n`
        spokeVnetResources += `          }`
      })

      spokeVnetResources += `\n        ]\n`
      spokeVnetResources += `      }\n`
      spokeVnetResources += `    }`

      // VNET Peering resources
      // Hub to Spoke
      vnetPeeringResources += `,\n    {\n`
      vnetPeeringResources += `      "type": "Microsoft.Network/virtualNetworks/virtualNetworkPeerings",\n`
      vnetPeeringResources += `      "apiVersion": "2025-01-01",\n`
      vnetPeeringResources += `      "name": "[concat(variables('vnetName'), '/hub-to-spoke${spokeNum}')]",\n`
      vnetPeeringResources += `      "dependsOn": [\n`
      vnetPeeringResources += `        "[resourceId('Microsoft.Network/virtualNetworks', variables('vnetName'))]",\n`
      vnetPeeringResources += `        "[resourceId('Microsoft.Network/virtualNetworks', variables('spoke${spokeNum}VnetName'))]"\n`
      vnetPeeringResources += `      ],\n`
      vnetPeeringResources += `      "properties": {\n`
      vnetPeeringResources += `        "allowVirtualNetworkAccess": true,\n`
      vnetPeeringResources += `        "allowForwardedTraffic": true,\n`
      vnetPeeringResources += `        "allowGatewayTransit": false,\n`
      vnetPeeringResources += `        "useRemoteGateways": false,\n`
      vnetPeeringResources += `        "remoteVirtualNetwork": {\n`
      vnetPeeringResources += `          "id": "[resourceId('Microsoft.Network/virtualNetworks', variables('spoke${spokeNum}VnetName'))]"\n`
      vnetPeeringResources += `        }\n`
      vnetPeeringResources += `      }\n`
      vnetPeeringResources += `    }`

      // Spoke to Hub
      vnetPeeringResources += `,\n    {\n`
      vnetPeeringResources += `      "type": "Microsoft.Network/virtualNetworks/virtualNetworkPeerings",\n`
      vnetPeeringResources += `      "apiVersion": "2025-01-01",\n`
      vnetPeeringResources += `      "name": "[concat(variables('spoke${spokeNum}VnetName'), '/spoke${spokeNum}-to-hub')]",\n`
      vnetPeeringResources += `      "dependsOn": [\n`
      vnetPeeringResources += `        "[resourceId('Microsoft.Network/virtualNetworks', variables('vnetName'))]",\n`
      vnetPeeringResources += `        "[resourceId('Microsoft.Network/virtualNetworks', variables('spoke${spokeNum}VnetName'))]"\n`
      vnetPeeringResources += `      ],\n`
      vnetPeeringResources += `      "properties": {\n`
      vnetPeeringResources += `        "allowVirtualNetworkAccess": true,\n`
      vnetPeeringResources += `        "allowForwardedTraffic": true,\n`
      vnetPeeringResources += `        "allowGatewayTransit": false,\n`
      vnetPeeringResources += `        "useRemoteGateways": false,\n`
      vnetPeeringResources += `        "remoteVirtualNetwork": {\n`
      vnetPeeringResources += `          "id": "[resourceId('Microsoft.Network/virtualNetworks', variables('vnetName'))]"\n`
      vnetPeeringResources += `        }\n`
      vnetPeeringResources += `      }\n`
      vnetPeeringResources += `    }`
    })

    // Spoke VNET outputs
    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      spokeVnetOutputs += `,\n    "spoke${spokeNum}VnetId": {\n`
      spokeVnetOutputs += `      "type": "string",\n`
      spokeVnetOutputs += `      "value": "[resourceId('Microsoft.Network/virtualNetworks', variables('spoke${spokeNum}VnetName'))]",\n`
      spokeVnetOutputs += `      "metadata": {\n`
      spokeVnetOutputs += `        "description": "Resource ID of Spoke ${spokeNum} Virtual Network"\n`
      spokeVnetOutputs += `      }\n`
      spokeVnetOutputs += `    }`
    })
  }

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetDefinitions}}', subnetDefinitions)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)
  content = content.replace('{{spokeVnetVariables}}', spokeVnetVariables)
  content = content.replace('{{spokeVnetResources}}', spokeVnetResources)
  content = content.replace('{{vnetPeeringResources}}', vnetPeeringResources)
  content = content.replace('{{spokeVnetOutputs}}', spokeVnetOutputs)

  return content
}

/**
 * Process Azure PowerShell template
 */
export function processAzurePowerShellTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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

  // Generate spoke VNET resources
  let spokeVnetVariables = ''
  let spokeVnetCreation = ''
  let vnetPeering = ''

  if (data.peeringEnabled && data.spokeVNets && data.spokeVNets.length > 0) {
    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1
      const spokeName = `\${Prefix}-spoke${spokeNum}-vnet`

      // Spoke VNET variables
      spokeVnetVariables += `$Spoke${spokeNum}VNetName = "${spokeName}"\n`
      spokeVnetVariables += `$Spoke${spokeNum}VNetCidr = "${spoke.cidr}"\n`

      // Spoke subnet variables
      spoke.subnets.forEach((subnet, subnetIndex) => {
        spokeVnetVariables += `$Spoke${spokeNum}Subnet${subnetIndex + 1}Name = "${spokeName}-subnet${subnetIndex + 1}"\n`
        spokeVnetVariables += `$Spoke${spokeNum}Subnet${subnetIndex + 1}Cidr = "${subnet.cidr}"\n`
      })
      spokeVnetVariables += '\n'
    })

    // Spoke VNET creation section
    spokeVnetCreation += '\n# ========================================\n'
    spokeVnetCreation += '# Create Spoke VNets\n'
    spokeVnetCreation += '# ========================================\n\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Create subnet configurations for spoke
      spokeVnetCreation += `Write-Host "Creating Spoke ${spokeNum} subnet configurations..." -ForegroundColor Cyan\n`
      spoke.subnets.forEach((subnet, subnetIndex) => {
        spokeVnetCreation += `$Spoke${spokeNum}SubnetConfig${subnetIndex + 1} = New-AzVirtualNetworkSubnetConfig \`\n`
        spokeVnetCreation += `    -Name $Spoke${spokeNum}Subnet${subnetIndex + 1}Name \`\n`
        spokeVnetCreation += `    -AddressPrefix $Spoke${spokeNum}Subnet${subnetIndex + 1}Cidr\n`
        spokeVnetCreation += `Write-Host "  - Spoke ${spokeNum} Subnet ${subnetIndex + 1}: $Spoke${spokeNum}Subnet${subnetIndex + 1}Name ($Spoke${spokeNum}Subnet${subnetIndex + 1}Cidr)" -ForegroundColor Gray\n\n`
      })

      // Create spoke VNET
      spokeVnetCreation += `Write-Host "Creating Spoke ${spokeNum} Virtual Network: $Spoke${spokeNum}VNetName" -ForegroundColor Cyan\n`
      spokeVnetCreation += `try {\n`
      spokeVnetCreation += `    $spoke${spokeNum}Vnet = New-AzVirtualNetwork \`\n`
      spokeVnetCreation += `        -Name $Spoke${spokeNum}VNetName \`\n`
      spokeVnetCreation += `        -ResourceGroupName $ResourceGroupName \`\n`
      spokeVnetCreation += `        -Location $Location \`\n`
      spokeVnetCreation += `        -AddressPrefix $Spoke${spokeNum}VNetCidr \`\n`
      const spokeSubnetConfigList = spoke.subnets.map((_, subnetIndex) => `$Spoke${spokeNum}SubnetConfig${subnetIndex + 1}`).join(', ')
      spokeVnetCreation += `        -Subnet ${spokeSubnetConfigList} \`\n`
      spokeVnetCreation += `        -Tag $Tags\n`
      spokeVnetCreation += `    Write-Host "✓ Spoke ${spokeNum} Virtual Network created successfully" -ForegroundColor Green\n`
      spokeVnetCreation += `}\n`
      spokeVnetCreation += `catch {\n`
      spokeVnetCreation += `    Write-Error "Failed to create Spoke ${spokeNum} Virtual Network: $_"\n`
      spokeVnetCreation += `    exit 1\n`
      spokeVnetCreation += `}\n\n`
    })

    // VNET Peering section
    vnetPeering += '\n# ========================================\n'
    vnetPeering += '# Create VNET Peering\n'
    vnetPeering += '# ========================================\n\n'

    data.spokeVNets.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Hub to Spoke peering
      vnetPeering += `Write-Host "Creating peering from Hub to Spoke ${spokeNum}" -ForegroundColor Cyan\n`
      vnetPeering += `try {\n`
      vnetPeering += `    Add-AzVirtualNetworkPeering \`\n`
      vnetPeering += `        -Name "hub-to-spoke${spokeNum}" \`\n`
      vnetPeering += `        -VirtualNetwork $vnet \`\n`
      vnetPeering += `        -RemoteVirtualNetworkId $spoke${spokeNum}Vnet.Id\n`
      vnetPeering += `    Write-Host "✓ Peering from Hub to Spoke ${spokeNum} created" -ForegroundColor Green\n`
      vnetPeering += `}\n`
      vnetPeering += `catch {\n`
      vnetPeering += `    Write-Error "Failed to create peering from Hub to Spoke ${spokeNum}: $_"\n`
      vnetPeering += `}\n\n`

      // Spoke to Hub peering
      vnetPeering += `Write-Host "Creating peering from Spoke ${spokeNum} to Hub" -ForegroundColor Cyan\n`
      vnetPeering += `try {\n`
      vnetPeering += `    Add-AzVirtualNetworkPeering \`\n`
      vnetPeering += `        -Name "spoke${spokeNum}-to-hub" \`\n`
      vnetPeering += `        -VirtualNetwork $spoke${spokeNum}Vnet \`\n`
      vnetPeering += `        -RemoteVirtualNetworkId $vnet.Id\n`
      vnetPeering += `    Write-Host "✓ Peering from Spoke ${spokeNum} to Hub created" -ForegroundColor Green\n`
      vnetPeering += `}\n`
      vnetPeering += `catch {\n`
      vnetPeering += `    Write-Error "Failed to create peering from Spoke ${spokeNum} to Hub: $_"\n`
      vnetPeering += `}\n\n`
    })
  }

  // Replace placeholders
  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetConfigurations}}', subnetConfigurations)
  content = content.replace('{{subnetConfigList}}', subnetConfigList)
  content = content.replace('{{spokeVnetVariables}}', spokeVnetVariables)
  content = content.replace('{{spokeVnetCreation}}', spokeVnetCreation)
  content = content.replace('{{vnetPeering}}', vnetPeering)

  return content
}

// ============================================
// AWS Template Processors
// ============================================

/**
 * Process AWS CLI template
 */
export function processAWSCLITemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += `SUBNET${index + 1}_CIDR="${subnet.cidr}"\n`
  })

  // Generate subnet creation commands
  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    const azIndex = index
    subnetCreation += `# Determine AZ for Subnet ${index + 1}\n`
    subnetCreation += `SUBNET${index + 1}_AZ="\${AVAILABILITY_ZONES[${azIndex} % \${AZ_COUNT}]}"\n`
    subnetCreation += `echo "Creating Subnet ${index + 1} in \${SUBNET${index + 1}_AZ}..."\n`
    subnetCreation += `SUBNET${index + 1}_ID=$(aws ec2 create-subnet \\\n`
    subnetCreation += `  --vpc-id "\${VPC_ID}" \\\n`
    subnetCreation += `  --cidr-block "\${SUBNET${index + 1}_CIDR}" \\\n`
    subnetCreation += `  --availability-zone "\${SUBNET${index + 1}_AZ}" \\\n`
    subnetCreation += `  --region "\${REGION}" \\\n`
    subnetCreation += `  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=\${PREFIX}-subnet${index + 1}}]" \\\n`
    subnetCreation += `  --query 'Subnet.SubnetId' \\\n`
    subnetCreation += `  --output text)\n\n`
    subnetCreation += `echo "Subnet ${index + 1} ID: \${SUBNET${index + 1}_ID}"\n\n`
  })

  // Replace placeholders
  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

/**
 * Process AWS Terraform template
 */
export function processAWSTerraformTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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
    subnetResources += `resource "aws_subnet" "subnet${index + 1}" {\n`
    subnetResources += `  vpc_id            = aws_vpc.vpc.id\n`
    subnetResources += `  cidr_block        = var.subnet${index + 1}_cidr\n`
    subnetResources += `  availability_zone = data.aws_availability_zones.available.names[${index} % length(data.aws_availability_zones.available.names)]\n\n`
    subnetResources += `  tags = {\n`
    subnetResources += `    Name        = "\${lookup(aws_vpc.vpc.tags, "Name")}-subnet${index + 1}"\n`
    subnetResources += `    Environment = "Production"\n`
    subnetResources += `    ManagedBy   = "Terraform"\n`
    subnetResources += `  }\n`
    subnetResources += `}\n\n`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `\noutput "subnet${index + 1}_id" {\n`
    subnetOutputs += `  description = "ID of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = aws_subnet.subnet${index + 1}.id\n`
    subnetOutputs += `}\n`
  })

  // Replace placeholders
  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Process AWS CloudFormation template
 */
export function processAWSCloudFormationTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate subnet parameters
  let subnetParameters = ''
  data.subnets.forEach((subnet, index) => {
    subnetParameters += `\n  Subnet${index + 1}Cidr:\n`
    subnetParameters += `    Type: String\n`
    subnetParameters += `    Default: ${subnet.cidr}\n`
    subnetParameters += `    Description: CIDR block for Subnet ${index + 1}\n`
  })

  // Generate subnet resources with dynamic AZ selection
  let subnetResources = ''
  data.subnets.forEach((subnet, index) => {
    const azSelectors = [
      '!Select [0, !GetAZs ""]',
      '!Select [1, !GetAZs ""]',
      '!Select [2, !GetAZs ""]',
      '!Select [3, !GetAZs ""]',
      '!Select [4, !GetAZs ""]',
      '!Select [5, !GetAZs ""]'
    ]
    const azSelector = azSelectors[index % azSelectors.length]

    subnetResources += `\n  Subnet${index + 1}:\n`
    subnetResources += `    Type: AWS::EC2::Subnet\n`
    subnetResources += `    Properties:\n`
    subnetResources += `      VpcId: !Ref VPC\n`
    subnetResources += `      CidrBlock: !Ref Subnet${index + 1}Cidr\n`
    subnetResources += `      AvailabilityZone: ${azSelector}\n`
    subnetResources += `      Tags:\n`
    subnetResources += `        - Key: Name\n`
    subnetResources += `          Value: !Sub '\${Prefix}-subnet${index + 1}'\n`
    subnetResources += `        - Key: Environment\n`
    subnetResources += `          Value: Production\n`
    subnetResources += `        - Key: ManagedBy\n`
    subnetResources += `          Value: CloudFormation\n`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `\n  Subnet${index + 1}Id:\n`
    subnetOutputs += `    Description: ID of Subnet ${index + 1}\n`
    subnetOutputs += `    Value: !Ref Subnet${index + 1}\n`
    subnetOutputs += `    Export:\n`
    subnetOutputs += `      Name: !Sub '\${AWS::StackName}-Subnet${index + 1}Id'\n`
  })

  // Replace placeholders
  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

// ============================================
// GCP Template Processors
// ============================================

/**
 * Process GCP gcloud CLI template
 */
export function processGCPGcloudTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate subnet creation commands
  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += `echo "Creating Subnet ${index + 1} in ${subnet.region || 'us-central1'}..."\n`
    subnetCreation += `gcloud compute networks subnets create "\${VPC_NAME}-subnet${index + 1}" \\\n`
    subnetCreation += `  --network="\${VPC_NAME}" \\\n`
    subnetCreation += `  --region="${subnet.region || 'us-central1'}" \\\n`
    subnetCreation += `  --range="${subnet.cidr}" \\\n`
    subnetCreation += `  --enable-private-ip-google-access\n\n`
  })

  // Generate spoke VPC variables and creation commands if peering is enabled
  let spokeVPCVariables = ''
  let spokeVPCCreation = ''
  let spokePeeringCreation = ''

  if (data.peeringEnabled && data.spokeVPCs && data.spokeVPCs.length > 0) {
    data.spokeVPCs.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Add spoke VPC variables
      spokeVPCVariables += `SPOKE${spokeNum}_VPC_NAME="\${VPC_NAME}-spoke${spokeNum}"\n`
      spokeVPCVariables += `SPOKE${spokeNum}_CIDR="${spoke.cidr}"\n`

      // Add spoke VPC creation
      spokeVPCCreation += `\necho "Creating Spoke VPC ${spokeNum}..."\n`
      spokeVPCCreation += `gcloud compute networks create "\${SPOKE${spokeNum}_VPC_NAME}" \\\n`
      spokeVPCCreation += `  --project="\${PROJECT_ID}" \\\n`
      spokeVPCCreation += `  --subnet-mode=custom \\\n`
      spokeVPCCreation += `  --bgp-routing-mode=regional\n\n`

      // Add spoke subnets
      if (spoke.subnets && spoke.subnets.length > 0) {
        spoke.subnets.forEach((subnet: any, subnetIndex: number) => {
          spokeVPCCreation += `echo "Creating Subnet ${subnetIndex + 1} in Spoke VPC ${spokeNum}..."\n`
          spokeVPCCreation += `gcloud compute networks subnets create "\${SPOKE${spokeNum}_VPC_NAME}-subnet${subnetIndex + 1}" \\\n`
          spokeVPCCreation += `  --network="\${SPOKE${spokeNum}_VPC_NAME}" \\\n`
          spokeVPCCreation += `  --region="${subnet.region || 'us-central1'}" \\\n`
          spokeVPCCreation += `  --range="${subnet.cidr}" \\\n`
          spokeVPCCreation += `  --enable-private-ip-google-access\n\n`
        })
      }

      // Add peering from hub to spoke only
      // GCP automatically creates the reverse peering in same-project scenarios
      spokePeeringCreation += `\necho "Creating peering from Hub to Spoke ${spokeNum}..."\n`
      spokePeeringCreation += `gcloud compute networks peerings create "hub-to-spoke${spokeNum}" \\\n`
      spokePeeringCreation += `  --network="\${VPC_NAME}" \\\n`
      spokePeeringCreation += `  --peer-network="\${SPOKE${spokeNum}_VPC_NAME}" \\\n`
      spokePeeringCreation += `  --auto-create-routes\n\n`
    })
  }

  // Replace placeholders
  content = content.replace('{{spokeVPCVariables}}', spokeVPCVariables)
  content = content.replace('{{subnetCreation}}', subnetCreation)
  content = content.replace('{{spokeVPCCreation}}', spokeVPCCreation)
  content = content.replace('{{spokePeeringCreation}}', spokePeeringCreation)

  return content
}

/**
 * Process GCP Terraform template
 */
export function processGCPTerraformTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += `\nvariable "subnet${index + 1}_cidr" {\n`
    subnetVariables += `  description = "CIDR block for Subnet ${index + 1}"\n`
    subnetVariables += `  type        = string\n`
    subnetVariables += `  default     = "${subnet.cidr}"\n`
    subnetVariables += `}\n`

    subnetVariables += `\nvariable "subnet${index + 1}_region" {\n`
    subnetVariables += `  description = "Region for Subnet ${index + 1}"\n`
    subnetVariables += `  type        = string\n`
    subnetVariables += `  default     = "${subnet.region || 'us-central1'}"\n`
    subnetVariables += `}\n`
  })

  // Generate subnet resources
  let subnetResources = ''
  data.subnets.forEach((subnet, index) => {
    subnetResources += `resource "google_compute_subnetwork" "subnet${index + 1}" {\n`
    subnetResources += `  name          = "\${var.vpc_name}-subnet${index + 1}"\n`
    subnetResources += `  ip_cidr_range = var.subnet${index + 1}_cidr\n`
    subnetResources += `  region        = var.subnet${index + 1}_region\n`
    subnetResources += `  network       = google_compute_network.vpc.id\n`
    subnetResources += `  project       = var.project_id\n\n`
    subnetResources += `  private_ip_google_access = true\n\n`
    subnetResources += `  log_config {\n`
    subnetResources += `    aggregation_interval = "INTERVAL_10_MIN"\n`
    subnetResources += `    flow_sampling        = 0.5\n`
    subnetResources += `    metadata             = "INCLUDE_ALL_METADATA"\n`
    subnetResources += `  }\n`
    subnetResources += `}\n\n`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `\noutput "subnet${index + 1}_name" {\n`
    subnetOutputs += `  description = "Name of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = google_compute_subnetwork.subnet${index + 1}.name\n`
    subnetOutputs += `}\n`

    subnetOutputs += `\noutput "subnet${index + 1}_id" {\n`
    subnetOutputs += `  description = "ID of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = google_compute_subnetwork.subnet${index + 1}.id\n`
    subnetOutputs += `}\n`

    subnetOutputs += `\noutput "subnet${index + 1}_self_link" {\n`
    subnetOutputs += `  description = "Self link of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = google_compute_subnetwork.subnet${index + 1}.self_link\n`
    subnetOutputs += `}\n`
  })

  // Generate spoke VPC variables, resources, and peering if peering is enabled
  let spokeVPCVariables = ''
  let spokeVPCResources = ''
  let spokePeeringResources = ''
  let spokeOutputs = ''

  if (data.peeringEnabled && data.spokeVPCs && data.spokeVPCs.length > 0) {
    data.spokeVPCs.forEach((spoke, spokeIndex) => {
      const spokeNum = spokeIndex + 1

      // Add spoke VPC variables
      spokeVPCVariables += `\nvariable "spoke${spokeNum}_cidr" {\n`
      spokeVPCVariables += `  description = "CIDR block for Spoke VPC ${spokeNum}"\n`
      spokeVPCVariables += `  type        = string\n`
      spokeVPCVariables += `  default     = "${spoke.cidr}"\n`
      spokeVPCVariables += `}\n`

      // Add spoke VPC resource
      spokeVPCResources += `\nresource "google_compute_network" "spoke${spokeNum}_vpc" {\n`
      spokeVPCResources += `  name                    = "\${var.vpc_name}-spoke${spokeNum}"\n`
      spokeVPCResources += `  auto_create_subnetworks = false\n`
      spokeVPCResources += `  project                 = var.project_id\n`
      spokeVPCResources += `  routing_mode            = "REGIONAL"\n`
      spokeVPCResources += `}\n`

      // Add spoke subnets
      if (spoke.subnets && spoke.subnets.length > 0) {
        spoke.subnets.forEach((subnet: any, subnetIndex: number) => {
          const subnetNum = subnetIndex + 1

          // Add subnet variables
          spokeVPCVariables += `\nvariable "spoke${spokeNum}_subnet${subnetNum}_cidr" {\n`
          spokeVPCVariables += `  description = "CIDR block for Spoke ${spokeNum} Subnet ${subnetNum}"\n`
          spokeVPCVariables += `  type        = string\n`
          spokeVPCVariables += `  default     = "${subnet.cidr}"\n`
          spokeVPCVariables += `}\n`

          spokeVPCVariables += `\nvariable "spoke${spokeNum}_subnet${subnetNum}_region" {\n`
          spokeVPCVariables += `  description = "Region for Spoke ${spokeNum} Subnet ${subnetNum}"\n`
          spokeVPCVariables += `  type        = string\n`
          spokeVPCVariables += `  default     = "${subnet.region || 'us-central1'}"\n`
          spokeVPCVariables += `}\n`

          // Add subnet resources
          spokeVPCResources += `\nresource "google_compute_subnetwork" "spoke${spokeNum}_subnet${subnetNum}" {\n`
          spokeVPCResources += `  name          = "\${var.vpc_name}-spoke${spokeNum}-subnet${subnetNum}"\n`
          spokeVPCResources += `  ip_cidr_range = var.spoke${spokeNum}_subnet${subnetNum}_cidr\n`
          spokeVPCResources += `  region        = var.spoke${spokeNum}_subnet${subnetNum}_region\n`
          spokeVPCResources += `  network       = google_compute_network.spoke${spokeNum}_vpc.id\n`
          spokeVPCResources += `  project       = var.project_id\n\n`
          spokeVPCResources += `  private_ip_google_access = true\n\n`
          spokeVPCResources += `  log_config {\n`
          spokeVPCResources += `    aggregation_interval = "INTERVAL_10_MIN"\n`
          spokeVPCResources += `    flow_sampling        = 0.5\n`
          spokeVPCResources += `    metadata             = "INCLUDE_ALL_METADATA"\n`
          spokeVPCResources += `  }\n`
          spokeVPCResources += `}\n`
        })
      }

      // Add peering from hub to spoke only
      // GCP automatically creates the reverse peering in same-project scenarios
      spokePeeringResources += `\nresource "google_compute_network_peering" "hub_to_spoke${spokeNum}" {\n`
      spokePeeringResources += `  name         = "hub-to-spoke${spokeNum}"\n`
      spokePeeringResources += `  network      = google_compute_network.vpc.self_link\n`
      spokePeeringResources += `  peer_network = google_compute_network.spoke${spokeNum}_vpc.self_link\n`
      spokePeeringResources += `}\n`

      // Add spoke VPC outputs
      spokeOutputs += `\noutput "spoke${spokeNum}_vpc_name" {\n`
      spokeOutputs += `  description = "Name of Spoke VPC ${spokeNum}"\n`
      spokeOutputs += `  value       = google_compute_network.spoke${spokeNum}_vpc.name\n`
      spokeOutputs += `}\n`

      spokeOutputs += `\noutput "spoke${spokeNum}_vpc_id" {\n`
      spokeOutputs += `  description = "ID of Spoke VPC ${spokeNum}"\n`
      spokeOutputs += `  value       = google_compute_network.spoke${spokeNum}_vpc.id\n`
      spokeOutputs += `}\n`
    })
  }

  // Replace placeholders
  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)
  content = content.replace('{{spokeVPCVariables}}', spokeVPCVariables)
  content = content.replace('{{spokeVPCResources}}', spokeVPCResources)
  content = content.replace('{{spokePeeringResources}}', spokePeeringResources)
  content = content.replace('{{spokeOutputs}}', spokeOutputs)

  return content
}

// ============================================
// Oracle Cloud Template Processors
// ============================================

/**
 * Process Oracle OCI CLI template
 */
export function processOracleOCITemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate subnet creation commands
  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += `echo "Creating Subnet ${index + 1}..."\n`
    subnetCreation += `SUBNET${index + 1}_ID=$(oci network subnet create \\\n`
    subnetCreation += `  --compartment-id "\${COMPARTMENT_ID}" \\\n`
    subnetCreation += `  --vcn-id "\${VCN_ID}" \\\n`
    subnetCreation += `  --cidr-block "${subnet.cidr}" \\\n`
    subnetCreation += `  --display-name "\${VCN_NAME}-subnet${index + 1}" \\\n`
    subnetCreation += `  --dns-label "subnet${index + 1}" \\\n`
    subnetCreation += `  --route-table-id "\${RT_ID}" \\\n`
    subnetCreation += `  --security-list-ids '["\${SL_ID}"]' \\\n`
    subnetCreation += `  --query 'data.id' \\\n`
    subnetCreation += `  --raw-output)\n\n`
    subnetCreation += `echo "Subnet ${index + 1} created with ID: \${SUBNET${index + 1}_ID}"\n\n`
  })

  // Replace placeholders
  content = content.replace(/{{vcnCidr}}/g, data.vnetCidr)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

/**
 * Process Oracle Terraform template
 */
export function processOracleTerraformTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

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
    subnetResources += `resource "oci_core_subnet" "subnet${index + 1}" {\n`
    subnetResources += `  compartment_id             = var.compartment_id\n`
    subnetResources += `  vcn_id                     = oci_core_vcn.vcn.id\n`
    subnetResources += `  cidr_block                 = var.subnet${index + 1}_cidr\n`
    subnetResources += `  display_name               = "\${var.vcn_name}-subnet${index + 1}"\n`
    subnetResources += `  dns_label                  = "subnet${index + 1}"\n`
    subnetResources += `  route_table_id             = oci_core_route_table.rt.id\n`
    subnetResources += `  security_list_ids          = [oci_core_security_list.sl.id]\n`
    subnetResources += `  prohibit_public_ip_on_vnic = false\n\n`
    subnetResources += `  freeform_tags = {\n`
    subnetResources += `    "Environment" = "Production"\n`
    subnetResources += `    "ManagedBy"   = "Terraform"\n`
    subnetResources += `  }\n`
    subnetResources += `}\n\n`
  })

  // Generate subnet outputs
  let subnetOutputs = ''
  data.subnets.forEach((subnet, index) => {
    subnetOutputs += `\noutput "subnet${index + 1}_id" {\n`
    subnetOutputs += `  description = "OCID of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = oci_core_subnet.subnet${index + 1}.id\n`
    subnetOutputs += `}\n`

    subnetOutputs += `\noutput "subnet${index + 1}_name" {\n`
    subnetOutputs += `  description = "Name of Subnet ${index + 1}"\n`
    subnetOutputs += `  value       = oci_core_subnet.subnet${index + 1}.display_name\n`
    subnetOutputs += `}\n`
  })

  // Replace placeholders
  content = content.replace('{{vcnCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

// ============================================
// AliCloud Template Processors
// ============================================

/**
 * Process AliCloud Aliyun CLI template
 */
export function processAliCloudAliyunTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate vSwitch creation commands
  let vSwitchCreation = ''
  data.subnets.forEach((subnet, index) => {
    vSwitchCreation += `echo "Creating vSwitch ${index + 1} in ${subnet.zone || 'cn-hangzhou-a'}..."\n`
    vSwitchCreation += `VSWITCH${index + 1}_ID=$(aliyun vpc CreateVSwitch \\\n`
    vSwitchCreation += `  --RegionId "\${REGION}" \\\n`
    vSwitchCreation += `  --VpcId "\${VPC_ID}" \\\n`
    vSwitchCreation += `  --ZoneId "${subnet.zone || 'cn-hangzhou-a'}" \\\n`
    vSwitchCreation += `  --CidrBlock "${subnet.cidr}" \\\n`
    vSwitchCreation += `  --VSwitchName "\${VPC_NAME}-vswitch${index + 1}" \\\n`
    vSwitchCreation += `  --Description "vSwitch ${index + 1} for ${subnet.zone || 'cn-hangzhou-a'}" \\\n`
    vSwitchCreation += `  --output cols=VSwitchId rows=VSwitchId \\\n`
    vSwitchCreation += `  | tail -n 1 | tr -d ' ')\n\n`
    vSwitchCreation += `echo "vSwitch ${index + 1} created with ID: \${VSWITCH${index + 1}_ID}"\n`
    vSwitchCreation += `sleep 2\n\n`
  })

  // Replace placeholders
  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{vSwitchCreation}}', vSwitchCreation)

  return content
}

/**
 * Process AliCloud Terraform template
 */
export function processAliCloudTerraformTemplate(templateContent: string, data: TemplateData): string {
  let content = templateContent

  // Generate vSwitch variables
  let vSwitchVariables = ''
  data.subnets.forEach((subnet, index) => {
    vSwitchVariables += `\nvariable "vswitch${index + 1}_cidr" {\n`
    vSwitchVariables += `  description = "CIDR block for vSwitch ${index + 1}"\n`
    vSwitchVariables += `  type        = string\n`
    vSwitchVariables += `  default     = "${subnet.cidr}"\n`
    vSwitchVariables += `}\n`

    vSwitchVariables += `\nvariable "vswitch${index + 1}_zone" {\n`
    vSwitchVariables += `  description = "Availability Zone for vSwitch ${index + 1}"\n`
    vSwitchVariables += `  type        = string\n`
    vSwitchVariables += `  default     = "${subnet.zone || 'cn-hangzhou-a'}"\n`
    vSwitchVariables += `}\n`
  })

  // Generate vSwitch resources
  let vSwitchResources = ''
  data.subnets.forEach((subnet, index) => {
    vSwitchResources += `resource "alicloud_vswitch" "vswitch${index + 1}" {\n`
    vSwitchResources += `  vpc_id       = alicloud_vpc.vpc.id\n`
    vSwitchResources += `  cidr_block   = var.vswitch${index + 1}_cidr\n`
    vSwitchResources += `  zone_id      = var.vswitch${index + 1}_zone\n`
    vSwitchResources += `  vswitch_name = "\${var.vpc_name}-vswitch${index + 1}"\n`
    vSwitchResources += `  description  = "vSwitch ${index + 1} in \${var.vswitch${index + 1}_zone}"\n\n`
    vSwitchResources += `  tags = {\n`
    vSwitchResources += `    Environment = "Production"\n`
    vSwitchResources += `    ManagedBy   = "Terraform"\n`
    vSwitchResources += `  }\n`
    vSwitchResources += `}\n\n`
  })

  // Generate vSwitch outputs
  let vSwitchOutputs = ''
  data.subnets.forEach((subnet, index) => {
    vSwitchOutputs += `\noutput "vswitch${index + 1}_id" {\n`
    vSwitchOutputs += `  description = "ID of vSwitch ${index + 1}"\n`
    vSwitchOutputs += `  value       = alicloud_vswitch.vswitch${index + 1}.id\n`
    vSwitchOutputs += `}\n`

    vSwitchOutputs += `\noutput "vswitch${index + 1}_name" {\n`
    vSwitchOutputs += `  description = "Name of vSwitch ${index + 1}"\n`
    vSwitchOutputs += `  value       = alicloud_vswitch.vswitch${index + 1}.vswitch_name\n`
    vSwitchOutputs += `}\n`

    vSwitchOutputs += `\noutput "vswitch${index + 1}_zone" {\n`
    vSwitchOutputs += `  description = "Zone of vSwitch ${index + 1}"\n`
    vSwitchOutputs += `  value       = alicloud_vswitch.vswitch${index + 1}.zone_id\n`
    vSwitchOutputs += `}\n`
  })

  // Replace placeholders
  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{vSwitchVariables}}', vSwitchVariables)
  content = content.replace('{{vSwitchResources}}', vSwitchResources)
  content = content.replace('{{vSwitchOutputs}}', vSwitchOutputs)

  return content
}
