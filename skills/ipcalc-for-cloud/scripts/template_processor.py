#!/usr/bin/env python3
"""
Template Processor for Cloud IaC Generation

Processes templates with placeholder replacement to generate IaC code.
Matches TypeScript CLI implementation.
"""

from typing import Dict, List, Any
import os


def process_azure_terraform_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process Azure Terraform template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vnetCidr, subnets, peeringEnabled, spokeVNets

    Returns:
        Processed Terraform code
    """
    content = template_content

    # Generate subnet variables
    subnet_variables = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_variables += f'\nvariable "subnet{idx}_cidr" {{\n'
        subnet_variables += f'  description = "CIDR block for Subnet {idx}"\n'
        subnet_variables += f'  type        = string\n'
        subnet_variables += f'  default     = "{subnet["cidr"]}"\n'
        subnet_variables += '}\n'

    # Generate subnet resources
    subnet_resources = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_resources += f'resource "azurerm_subnet" "subnet{idx}" {{\n'
        subnet_resources += f'  name                 = "${{var.prefix}}-subnet{idx}"\n'
        subnet_resources += f'  resource_group_name  = azurerm_resource_group.rg.name\n'
        subnet_resources += f'  virtual_network_name = azurerm_virtual_network.vnet.name\n'
        subnet_resources += f'  address_prefixes     = [var.subnet{idx}_cidr]\n'
        subnet_resources += '}\n\n'

    # Generate subnet outputs
    subnet_outputs = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_outputs += f'\noutput "subnet{idx}_id" {{\n'
        subnet_outputs += f'  description = "ID of Subnet {idx}"\n'
        subnet_outputs += f'  value       = azurerm_subnet.subnet{idx}.id\n'
        subnet_outputs += '}\n'

    # Generate spoke VNET resources
    spoke_vnet_resources = ''
    vnet_peering_resources = ''
    spoke_vnet_outputs = ''

    if data.get('peeringEnabled') and data.get('spokeVNets'):
        spoke_vnets = data['spokeVNets']

        spoke_vnet_resources += '\n# ========================================\n'
        spoke_vnet_resources += '# Spoke VNets\n'
        spoke_vnet_resources += '# ========================================\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            # Spoke VNET resource
            spoke_vnet_resources += f'resource "azurerm_virtual_network" "spoke{spoke_idx}_vnet" {{\n'
            spoke_vnet_resources += f'  name                = "${{var.prefix}}-spoke{spoke_idx}-vnet"\n'
            spoke_vnet_resources += f'  address_space       = ["{spoke["cidr"]}"]\n'
            spoke_vnet_resources += f'  location            = azurerm_resource_group.rg.location\n'
            spoke_vnet_resources += f'  resource_group_name = azurerm_resource_group.rg.name\n\n'
            spoke_vnet_resources += f'  tags = {{\n'
            spoke_vnet_resources += f'    Environment = "Production"\n'
            spoke_vnet_resources += f'    ManagedBy   = "Terraform"\n'
            spoke_vnet_resources += f'    Role        = "Spoke"\n'
            spoke_vnet_resources += f'  }}\n'
            spoke_vnet_resources += '}\n\n'

            # Spoke subnets
            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                spoke_vnet_resources += f'resource "azurerm_subnet" "spoke{spoke_idx}_subnet{subnet_idx}" {{\n'
                spoke_vnet_resources += f'  name                 = "${{var.prefix}}-spoke{spoke_idx}-subnet{subnet_idx}"\n'
                spoke_vnet_resources += f'  resource_group_name  = azurerm_resource_group.rg.name\n'
                spoke_vnet_resources += f'  virtual_network_name = azurerm_virtual_network.spoke{spoke_idx}_vnet.name\n'
                spoke_vnet_resources += f'  address_prefixes     = ["{subnet["cidr"]}"]\n'
                spoke_vnet_resources += '}\n\n'

        # VNET Peering resources
        vnet_peering_resources += '# ========================================\n'
        vnet_peering_resources += '# VNET Peering\n'
        vnet_peering_resources += '# ========================================\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            # Hub to Spoke peering
            vnet_peering_resources += f'resource "azurerm_virtual_network_peering" "hub_to_spoke{spoke_idx}" {{\n'
            vnet_peering_resources += f'  name                      = "hub-to-spoke{spoke_idx}"\n'
            vnet_peering_resources += f'  resource_group_name       = azurerm_resource_group.rg.name\n'
            vnet_peering_resources += f'  virtual_network_name      = azurerm_virtual_network.vnet.name\n'
            vnet_peering_resources += f'  remote_virtual_network_id = azurerm_virtual_network.spoke{spoke_idx}_vnet.id\n'
            vnet_peering_resources += f'  allow_virtual_network_access = true\n'
            vnet_peering_resources += f'  allow_forwarded_traffic      = true\n'
            vnet_peering_resources += f'  allow_gateway_transit        = false\n'
            vnet_peering_resources += '}\n\n'

            # Spoke to Hub peering
            vnet_peering_resources += f'resource "azurerm_virtual_network_peering" "spoke{spoke_idx}_to_hub" {{\n'
            vnet_peering_resources += f'  name                      = "spoke{spoke_idx}-to-hub"\n'
            vnet_peering_resources += f'  resource_group_name       = azurerm_resource_group.rg.name\n'
            vnet_peering_resources += f'  virtual_network_name      = azurerm_virtual_network.spoke{spoke_idx}_vnet.name\n'
            vnet_peering_resources += f'  remote_virtual_network_id = azurerm_virtual_network.vnet.id\n'
            vnet_peering_resources += f'  allow_virtual_network_access = true\n'
            vnet_peering_resources += f'  allow_forwarded_traffic      = true\n'
            vnet_peering_resources += f'  use_remote_gateways          = false\n'
            vnet_peering_resources += '}\n\n'

        # Spoke VNET outputs
        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_outputs += f'\noutput "spoke{spoke_idx}_vnet_id" {{\n'
            spoke_vnet_outputs += f'  description = "ID of Spoke {spoke_idx} VNet"\n'
            spoke_vnet_outputs += f'  value       = azurerm_virtual_network.spoke{spoke_idx}_vnet.id\n'
            spoke_vnet_outputs += '}\n'

    # Replace placeholders
    content = content.replace('{{vnetCidr}}', data['vnetCidr'])
    content = content.replace('{{subnetVariables}}', subnet_variables)
    content = content.replace('{{subnetResources}}', subnet_resources)
    content = content.replace('{{subnetOutputs}}', subnet_outputs)
    content = content.replace('{{spokeVnetResources}}', spoke_vnet_resources)
    content = content.replace('{{vnetPeeringResources}}', vnet_peering_resources)
    content = content.replace('{{spokeVnetOutputs}}', spoke_vnet_outputs)

    return content


def process_aws_terraform_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process AWS Terraform template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vpcCidr/vnetCidr, subnets

    Returns:
        Processed Terraform code
    """
    content = template_content

    # AWS uses vpcCidr, but data might have vnetCidr
    vpc_cidr = data.get('vpcCidr', data.get('vnetCidr', ''))

    # Generate subnet variables
    subnet_variables = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_variables += f'\nvariable "subnet{idx}_cidr" {{\n'
        subnet_variables += f'  description = "CIDR block for Subnet {idx}"\n'
        subnet_variables += f'  type        = string\n'
        subnet_variables += f'  default     = "{subnet["cidr"]}"\n'
        subnet_variables += '}\n'

    # Generate subnet resources with AZ distribution
    subnet_resources = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        az_index = idx - 1  # 0-based for modulo
        subnet_resources += f'resource "aws_subnet" "subnet{idx}" {{\n'
        subnet_resources += f'  vpc_id            = aws_vpc.vpc.id\n'
        subnet_resources += f'  cidr_block        = var.subnet{idx}_cidr\n'
        subnet_resources += f'  availability_zone = data.aws_availability_zones.available.names[{az_index} % length(data.aws_availability_zones.available.names)]\n\n'
        subnet_resources += f'  tags = {{\n'
        subnet_resources += f'    Name        = "${{var.prefix}}-subnet{idx}"\n'
        subnet_resources += f'    Environment = "Production"\n'
        subnet_resources += f'    ManagedBy   = "Terraform"\n'
        subnet_resources += f'  }}\n'
        subnet_resources += '}\n\n'

    # Generate subnet outputs
    subnet_outputs = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_outputs += f'\noutput "subnet{idx}_id" {{\n'
        subnet_outputs += f'  description = "ID of Subnet {idx}"\n'
        subnet_outputs += f'  value       = aws_subnet.subnet{idx}.id\n'
        subnet_outputs += '}\n'

        subnet_outputs += f'\noutput "subnet{idx}_az" {{\n'
        subnet_outputs += f'  description = "Availability Zone of Subnet {idx}"\n'
        subnet_outputs += f'  value       = aws_subnet.subnet{idx}.availability_zone\n'
        subnet_outputs += '}\n'

    # Replace placeholders
    content = content.replace('{{vpcCidr}}', vpc_cidr)
    content = content.replace('{{subnetVariables}}', subnet_variables)
    content = content.replace('{{subnetResources}}', subnet_resources)
    content = content.replace('{{subnetOutputs}}', subnet_outputs)

    return content


def load_template(template_path: str) -> str:
    """
    Load a template file from disk.

    Args:
        template_path: Path to template file

    Returns:
        Template content
    """
    with open(template_path, 'r') as f:
        return f.read()


def process_azure_cli_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process Azure CLI template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vnetCidr, subnets, peeringEnabled, spokeVNets

    Returns:
        Processed Azure CLI script
    """
    content = template_content

    # Generate subnet variables
    subnet_variables = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_variables += f'SUBNET{idx}_NAME="${{PREFIX}}-subnet{idx}"\n'
        subnet_variables += f'SUBNET{idx}_CIDR="{subnet["cidr"]}"\n'

    # Generate subnet creation commands
    subnet_creation = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_creation += f'echo "Creating Subnet {idx}: ${{SUBNET{idx}_NAME}}"\n'
        subnet_creation += f'az network vnet subnet create \\\n'
        subnet_creation += f'  --resource-group "${{RESOURCE_GROUP}}" \\\n'
        subnet_creation += f'  --vnet-name "${{VNET_NAME}}" \\\n'
        subnet_creation += f'  --name "${{SUBNET{idx}_NAME}}" \\\n'
        subnet_creation += f'  --address-prefix "${{SUBNET{idx}_CIDR}}"\n\n'

    # Generate spoke VNET variables, creation, and peering
    spoke_vnet_variables = ''
    spoke_vnet_creation = ''
    vnet_peering = ''

    if data.get('peeringEnabled') and data.get('spokeVNets'):
        spoke_vnets = data['spokeVNets']

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_name = f'${{PREFIX}}-spoke{spoke_idx}-vnet'
            spoke_vnet_variables += f'SPOKE{spoke_idx}_VNET_NAME="{spoke_name}"\n'
            spoke_vnet_variables += f'SPOKE{spoke_idx}_VNET_CIDR="{spoke["cidr"]}"\n'

            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                spoke_vnet_variables += f'SPOKE{spoke_idx}_SUBNET{subnet_idx}_NAME="{spoke_name}-subnet{subnet_idx}"\n'
                spoke_vnet_variables += f'SPOKE{spoke_idx}_SUBNET{subnet_idx}_CIDR="{subnet["cidr"]}"\n'
            spoke_vnet_variables += '\n'

        spoke_vnet_creation += '\n# ========================================\n'
        spoke_vnet_creation += '# Create Spoke VNets\n'
        spoke_vnet_creation += '# ========================================\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_creation += f'\necho "Creating Spoke VNET {spoke_idx}: ${{SPOKE{spoke_idx}_VNET_NAME}}"\n'
            spoke_vnet_creation += f'az network vnet create \\\n'
            spoke_vnet_creation += f'  --resource-group "${{RESOURCE_GROUP}}" \\\n'
            spoke_vnet_creation += f'  --name "${{SPOKE{spoke_idx}_VNET_NAME}}" \\\n'
            spoke_vnet_creation += f'  --address-prefix "${{SPOKE{spoke_idx}_VNET_CIDR}}" \\\n'
            spoke_vnet_creation += f'  --location "${{LOCATION}}"\n\n'

            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                spoke_vnet_creation += f'echo "Creating Spoke {spoke_idx} Subnet {subnet_idx}: ${{SPOKE{spoke_idx}_SUBNET{subnet_idx}_NAME}}"\n'
                spoke_vnet_creation += f'az network vnet subnet create \\\n'
                spoke_vnet_creation += f'  --resource-group "${{RESOURCE_GROUP}}" \\\n'
                spoke_vnet_creation += f'  --vnet-name "${{SPOKE{spoke_idx}_VNET_NAME}}" \\\n'
                spoke_vnet_creation += f'  --name "${{SPOKE{spoke_idx}_SUBNET{subnet_idx}_NAME}}" \\\n'
                spoke_vnet_creation += f'  --address-prefix "${{SPOKE{spoke_idx}_SUBNET{subnet_idx}_CIDR}}"\n\n'

        vnet_peering += '\n# ========================================\n'
        vnet_peering += '# Create VNET Peering\n'
        vnet_peering += '# ========================================\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            vnet_peering += f'\necho "Creating peering from Hub to Spoke {spoke_idx}"\n'
            vnet_peering += f'az network vnet peering create \\\n'
            vnet_peering += f'  --resource-group "${{RESOURCE_GROUP}}" \\\n'
            vnet_peering += f'  --name "hub-to-spoke{spoke_idx}" \\\n'
            vnet_peering += f'  --vnet-name "${{VNET_NAME}}" \\\n'
            vnet_peering += f'  --remote-vnet "${{SPOKE{spoke_idx}_VNET_NAME}}" \\\n'
            vnet_peering += f'  --allow-vnet-access\n\n'

            vnet_peering += f'echo "Creating peering from Spoke {spoke_idx} to Hub"\n'
            vnet_peering += f'az network vnet peering create \\\n'
            vnet_peering += f'  --resource-group "${{RESOURCE_GROUP}}" \\\n'
            vnet_peering += f'  --name "spoke{spoke_idx}-to-hub" \\\n'
            vnet_peering += f'  --vnet-name "${{SPOKE{spoke_idx}_VNET_NAME}}" \\\n'
            vnet_peering += f'  --remote-vnet "${{VNET_NAME}}" \\\n'
            vnet_peering += f'  --allow-vnet-access\n\n'

    # Replace placeholders
    content = content.replace('{{vnetCidr}}', data['vnetCidr'])
    content = content.replace('{{subnetVariables}}', subnet_variables)
    content = content.replace('{{subnetCreation}}', subnet_creation)
    content = content.replace('{{spokeVnetVariables}}', spoke_vnet_variables)
    content = content.replace('{{spokeVnetCreation}}', spoke_vnet_creation)
    content = content.replace('{{vnetPeering}}', vnet_peering)

    return content


def process_azure_bicep_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process Azure Bicep template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vnetCidr, subnets, peeringEnabled, spokeVNets

    Returns:
        Processed Bicep code
    """
    content = template_content

    # Generate subnet parameters
    subnet_parameters = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_parameters += f"\n@description('CIDR block for Subnet {idx}')\n"
        subnet_parameters += f"param subnet{idx}Cidr string = '{subnet['cidr']}'\n"

    # Generate subnet definitions
    subnet_definitions = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_definitions += f'      {{\n'
        subnet_definitions += f"        name: '${{prefix}}-subnet{idx}'\n"
        subnet_definitions += f'        properties: {{\n'
        subnet_definitions += f'          addressPrefix: subnet{idx}Cidr\n'
        subnet_definitions += f'        }}\n'
        subnet_definitions += f'      }}\n'

    # Generate subnet outputs
    subnet_outputs = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_outputs += f"\n@description('ID of Subnet {idx}')\n"
        subnet_outputs += f'output subnet{idx}Id string = vnet.properties.subnets[{idx - 1}].id\n'

    # Generate spoke VNET resources
    spoke_vnet_resources = ''
    vnet_peering_resources = ''
    spoke_vnet_outputs = ''

    if data.get('peeringEnabled') and data.get('spokeVNets'):
        spoke_vnets = data['spokeVNets']

        spoke_vnet_resources += '\n// ========================================\n'
        spoke_vnet_resources += '// Spoke VNets\n'
        spoke_vnet_resources += '// ========================================\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_resources += f"resource spoke{spoke_idx}Vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {{\n"
            spoke_vnet_resources += f"  name: '${{prefix}}-spoke{spoke_idx}-vnet'\n"
            spoke_vnet_resources += f'  location: location\n'
            spoke_vnet_resources += f'  tags: tags\n'
            spoke_vnet_resources += f'  properties: {{\n'
            spoke_vnet_resources += f'    addressSpace: {{\n'
            spoke_vnet_resources += f'      addressPrefixes: [\n'
            spoke_vnet_resources += f"        '{spoke['cidr']}'\n"
            spoke_vnet_resources += f'      ]\n'
            spoke_vnet_resources += f'    }}\n'
            spoke_vnet_resources += f'    subnets: [\n'

            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                spoke_vnet_resources += f'      {{\n'
                spoke_vnet_resources += f"        name: '${{prefix}}-spoke{spoke_idx}-subnet{subnet_idx}'\n"
                spoke_vnet_resources += f'        properties: {{\n'
                spoke_vnet_resources += f"          addressPrefix: '{subnet['cidr']}'\n"
                spoke_vnet_resources += f'        }}\n'
                spoke_vnet_resources += f'      }}\n'

            spoke_vnet_resources += f'    ]\n'
            spoke_vnet_resources += f'  }}\n'
            spoke_vnet_resources += f'}}\n\n'

        vnet_peering_resources += '// ========================================\n'
        vnet_peering_resources += '// VNET Peering\n'
        vnet_peering_resources += '// ========================================\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            vnet_peering_resources += f"resource hubToSpoke{spoke_idx}Peering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-05-01' = {{\n"
            vnet_peering_resources += f'  parent: vnet\n'
            vnet_peering_resources += f"  name: 'hub-to-spoke{spoke_idx}'\n"
            vnet_peering_resources += f'  properties: {{\n'
            vnet_peering_resources += f'    allowVirtualNetworkAccess: true\n'
            vnet_peering_resources += f'    allowForwardedTraffic: true\n'
            vnet_peering_resources += f'    allowGatewayTransit: false\n'
            vnet_peering_resources += f'    useRemoteGateways: false\n'
            vnet_peering_resources += f'    remoteVirtualNetwork: {{\n'
            vnet_peering_resources += f'      id: spoke{spoke_idx}Vnet.id\n'
            vnet_peering_resources += f'    }}\n'
            vnet_peering_resources += f'  }}\n'
            vnet_peering_resources += f'}}\n\n'

            vnet_peering_resources += f"resource spoke{spoke_idx}ToHubPeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-05-01' = {{\n"
            vnet_peering_resources += f'  parent: spoke{spoke_idx}Vnet\n'
            vnet_peering_resources += f"  name: 'spoke{spoke_idx}-to-hub'\n"
            vnet_peering_resources += f'  properties: {{\n'
            vnet_peering_resources += f'    allowVirtualNetworkAccess: true\n'
            vnet_peering_resources += f'    allowForwardedTraffic: true\n'
            vnet_peering_resources += f'    allowGatewayTransit: false\n'
            vnet_peering_resources += f'    useRemoteGateways: false\n'
            vnet_peering_resources += f'    remoteVirtualNetwork: {{\n'
            vnet_peering_resources += f'      id: vnet.id\n'
            vnet_peering_resources += f'    }}\n'
            vnet_peering_resources += f'  }}\n'
            vnet_peering_resources += f'}}\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_outputs += f"\n@description('ID of Spoke {spoke_idx} Virtual Network')\n"
            spoke_vnet_outputs += f'output spoke{spoke_idx}VnetId string = spoke{spoke_idx}Vnet.id\n'

            spoke_vnet_outputs += f"\n@description('Name of Spoke {spoke_idx} Virtual Network')\n"
            spoke_vnet_outputs += f'output spoke{spoke_idx}VnetName string = spoke{spoke_idx}Vnet.name\n'

    # Replace placeholders
    content = content.replace('{{vnetCidr}}', data['vnetCidr'])
    content = content.replace('{{subnetParameters}}', subnet_parameters)
    content = content.replace('{{subnetDefinitions}}', subnet_definitions)
    content = content.replace('{{subnetOutputs}}', subnet_outputs)
    content = content.replace('{{spokeVnetResources}}', spoke_vnet_resources)
    content = content.replace('{{vnetPeeringResources}}', vnet_peering_resources)
    content = content.replace('{{spokeVnetOutputs}}', spoke_vnet_outputs)

    return content


def process_azure_arm_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process Azure ARM template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vnetCidr, subnets, peeringEnabled, spokeVNets

    Returns:
        Processed ARM JSON code
    """
    content = template_content

    # Generate subnet parameters
    subnet_parameters = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_parameters += f',\n    "subnet{idx}Cidr": {{\n'
        subnet_parameters += f'      "type": "string",\n'
        subnet_parameters += f'      "defaultValue": "{subnet["cidr"]}",\n'
        subnet_parameters += f'      "metadata": {{\n'
        subnet_parameters += f'        "description": "CIDR block for Subnet {idx}"\n'
        subnet_parameters += f'      }}\n'
        subnet_parameters += f'    }}'

    # Generate subnet variables
    subnet_variables = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_variables += f',\n    "subnet{idx}Name": "[concat(parameters(\'prefix\'), \'-subnet{idx}\')]"'

    # Generate subnet definitions
    subnet_definitions = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        if idx > 1:
            subnet_definitions += ','
        subnet_definitions += f'\n          {{\n'
        subnet_definitions += f'            "name": "[variables(\'subnet{idx}Name\')]",\n'
        subnet_definitions += f'            "properties": {{\n'
        subnet_definitions += f'              "addressPrefix": "[parameters(\'subnet{idx}Cidr\')]"\n'
        subnet_definitions += f'            }}\n'
        subnet_definitions += f'          }}'

    # Generate subnet outputs
    subnet_outputs = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_outputs += f',\n    "subnet{idx}Id": {{\n'
        subnet_outputs += f'      "type": "string",\n'
        subnet_outputs += f'      "value": "[resourceId(\'Microsoft.Network/virtualNetworks/subnets\', variables(\'vnetName\'), variables(\'subnet{idx}Name\'))]",\n'
        subnet_outputs += f'      "metadata": {{\n'
        subnet_outputs += f'        "description": "Resource ID of Subnet {idx}"\n'
        subnet_outputs += f'      }}\n'
        subnet_outputs += f'    }}'

    # Generate spoke VNET resources
    spoke_vnet_variables = ''
    spoke_vnet_resources = ''
    vnet_peering_resources = ''
    spoke_vnet_outputs = ''

    if data.get('peeringEnabled') and data.get('spokeVNets'):
        spoke_vnets = data['spokeVNets']

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_variables += f',\n    "spoke{spoke_idx}VnetName": "[concat(parameters(\'prefix\'), \'-spoke{spoke_idx}-vnet\')]"'

            spoke_vnet_resources += f',\n    {{\n'
            spoke_vnet_resources += f'      "type": "Microsoft.Network/virtualNetworks",\n'
            spoke_vnet_resources += f'      "apiVersion": "2025-01-01",\n'
            spoke_vnet_resources += f'      "name": "[variables(\'spoke{spoke_idx}VnetName\')]",\n'
            spoke_vnet_resources += f'      "location": "[parameters(\'location\')]",\n'
            spoke_vnet_resources += f'      "tags": {{\n'
            spoke_vnet_resources += f'        "Environment": "Production",\n'
            spoke_vnet_resources += f'        "ManagedBy": "ARM Template",\n'
            spoke_vnet_resources += f'        "Role": "Spoke"\n'
            spoke_vnet_resources += f'      }},\n'
            spoke_vnet_resources += f'      "properties": {{\n'
            spoke_vnet_resources += f'        "addressSpace": {{\n'
            spoke_vnet_resources += f'          "addressPrefixes": [\n'
            spoke_vnet_resources += f'            "{spoke["cidr"]}"\n'
            spoke_vnet_resources += f'          ]\n'
            spoke_vnet_resources += f'        }},\n'
            spoke_vnet_resources += f'        "subnets": [\n'

            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                if subnet_idx > 1:
                    spoke_vnet_resources += ','
                spoke_vnet_resources += f'\n          {{\n'
                spoke_vnet_resources += f'            "name": "[concat(variables(\'spoke{spoke_idx}VnetName\'), \'-subnet{subnet_idx}\')]",\n'
                spoke_vnet_resources += f'            "properties": {{\n'
                spoke_vnet_resources += f'              "addressPrefix": "{subnet["cidr"]}"\n'
                spoke_vnet_resources += f'            }}\n'
                spoke_vnet_resources += f'          }}'

            spoke_vnet_resources += f'\n        ]\n'
            spoke_vnet_resources += f'      }}\n'
            spoke_vnet_resources += f'    }}'

            # Hub to Spoke peering
            vnet_peering_resources += f',\n    {{\n'
            vnet_peering_resources += f'      "type": "Microsoft.Network/virtualNetworks/virtualNetworkPeerings",\n'
            vnet_peering_resources += f'      "apiVersion": "2025-01-01",\n'
            vnet_peering_resources += f'      "name": "[concat(variables(\'vnetName\'), \'/hub-to-spoke{spoke_idx}\')]",\n'
            vnet_peering_resources += f'      "dependsOn": [\n'
            vnet_peering_resources += f'        "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'vnetName\'))]",\n'
            vnet_peering_resources += f'        "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'spoke{spoke_idx}VnetName\'))]"\n'
            vnet_peering_resources += f'      ],\n'
            vnet_peering_resources += f'      "properties": {{\n'
            vnet_peering_resources += f'        "allowVirtualNetworkAccess": true,\n'
            vnet_peering_resources += f'        "allowForwardedTraffic": true,\n'
            vnet_peering_resources += f'        "allowGatewayTransit": false,\n'
            vnet_peering_resources += f'        "useRemoteGateways": false,\n'
            vnet_peering_resources += f'        "remoteVirtualNetwork": {{\n'
            vnet_peering_resources += f'          "id": "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'spoke{spoke_idx}VnetName\'))]"\n'
            vnet_peering_resources += f'        }}\n'
            vnet_peering_resources += f'      }}\n'
            vnet_peering_resources += f'    }}'

            # Spoke to Hub peering
            vnet_peering_resources += f',\n    {{\n'
            vnet_peering_resources += f'      "type": "Microsoft.Network/virtualNetworks/virtualNetworkPeerings",\n'
            vnet_peering_resources += f'      "apiVersion": "2025-01-01",\n'
            vnet_peering_resources += f'      "name": "[concat(variables(\'spoke{spoke_idx}VnetName\'), \'/spoke{spoke_idx}-to-hub\')]",\n'
            vnet_peering_resources += f'      "dependsOn": [\n'
            vnet_peering_resources += f'        "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'vnetName\'))]",\n'
            vnet_peering_resources += f'        "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'spoke{spoke_idx}VnetName\'))]"\n'
            vnet_peering_resources += f'      ],\n'
            vnet_peering_resources += f'      "properties": {{\n'
            vnet_peering_resources += f'        "allowVirtualNetworkAccess": true,\n'
            vnet_peering_resources += f'        "allowForwardedTraffic": true,\n'
            vnet_peering_resources += f'        "allowGatewayTransit": false,\n'
            vnet_peering_resources += f'        "useRemoteGateways": false,\n'
            vnet_peering_resources += f'        "remoteVirtualNetwork": {{\n'
            vnet_peering_resources += f'          "id": "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'vnetName\'))]"\n'
            vnet_peering_resources += f'        }}\n'
            vnet_peering_resources += f'      }}\n'
            vnet_peering_resources += f'    }}'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_outputs += f',\n    "spoke{spoke_idx}VnetId": {{\n'
            spoke_vnet_outputs += f'      "type": "string",\n'
            spoke_vnet_outputs += f'      "value": "[resourceId(\'Microsoft.Network/virtualNetworks\', variables(\'spoke{spoke_idx}VnetName\'))]",\n'
            spoke_vnet_outputs += f'      "metadata": {{\n'
            spoke_vnet_outputs += f'        "description": "Resource ID of Spoke {spoke_idx} Virtual Network"\n'
            spoke_vnet_outputs += f'      }}\n'
            spoke_vnet_outputs += f'    }}'

    # Replace placeholders
    content = content.replace('{{vnetCidr}}', data['vnetCidr'])
    content = content.replace('{{subnetParameters}}', subnet_parameters)
    content = content.replace('{{subnetVariables}}', subnet_variables)
    content = content.replace('{{subnetDefinitions}}', subnet_definitions)
    content = content.replace('{{subnetOutputs}}', subnet_outputs)
    content = content.replace('{{spokeVnetVariables}}', spoke_vnet_variables)
    content = content.replace('{{spokeVnetResources}}', spoke_vnet_resources)
    content = content.replace('{{vnetPeeringResources}}', vnet_peering_resources)
    content = content.replace('{{spokeVnetOutputs}}', spoke_vnet_outputs)

    return content


def process_azure_powershell_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process Azure PowerShell template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vnetCidr, subnets, peeringEnabled, spokeVNets

    Returns:
        Processed PowerShell script
    """
    content = template_content

    # Generate subnet variables
    subnet_variables = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_variables += f'$Subnet{idx}Name = "${{Prefix}}-subnet{idx}"\n'
        subnet_variables += f'$Subnet{idx}Cidr = "{subnet["cidr"]}"\n'

    # Generate subnet configurations
    subnet_configurations = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_configurations += f'$SubnetConfig{idx} = New-AzVirtualNetworkSubnetConfig `\n'
        subnet_configurations += f'    -Name $Subnet{idx}Name `\n'
        subnet_configurations += f'    -AddressPrefix $Subnet{idx}Cidr\n'
        subnet_configurations += f'Write-Host "  - Subnet {idx}: $Subnet{idx}Name ($Subnet{idx}Cidr)" -ForegroundColor Gray\n\n'

    # Generate subnet config list
    subnet_config_list = ', '.join([f'$SubnetConfig{idx}' for idx in range(1, len(data['subnets']) + 1)])

    # Generate spoke VNET resources
    spoke_vnet_variables = ''
    spoke_vnet_creation = ''
    vnet_peering = ''

    if data.get('peeringEnabled') and data.get('spokeVNets'):
        spoke_vnets = data['spokeVNets']

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_name = f'${{Prefix}}-spoke{spoke_idx}-vnet'
            spoke_vnet_variables += f'$Spoke{spoke_idx}VNetName = "{spoke_name}"\n'
            spoke_vnet_variables += f'$Spoke{spoke_idx}VNetCidr = "{spoke["cidr"]}"\n'

            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                spoke_vnet_variables += f'$Spoke{spoke_idx}Subnet{subnet_idx}Name = "{spoke_name}-subnet{subnet_idx}"\n'
                spoke_vnet_variables += f'$Spoke{spoke_idx}Subnet{subnet_idx}Cidr = "{subnet["cidr"]}"\n'
            spoke_vnet_variables += '\n'

        spoke_vnet_creation += '\n# ========================================\n'
        spoke_vnet_creation += '# Create Spoke VNets\n'
        spoke_vnet_creation += '# ========================================\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            spoke_vnet_creation += f'Write-Host "Creating Spoke {spoke_idx} subnet configurations..." -ForegroundColor Cyan\n'
            for subnet_idx, subnet in enumerate(spoke['subnets'], 1):
                spoke_vnet_creation += f'$Spoke{spoke_idx}SubnetConfig{subnet_idx} = New-AzVirtualNetworkSubnetConfig `\n'
                spoke_vnet_creation += f'    -Name $Spoke{spoke_idx}Subnet{subnet_idx}Name `\n'
                spoke_vnet_creation += f'    -AddressPrefix $Spoke{spoke_idx}Subnet{subnet_idx}Cidr\n'
                spoke_vnet_creation += f'Write-Host "  - Spoke {spoke_idx} Subnet {subnet_idx}: $Spoke{spoke_idx}Subnet{subnet_idx}Name ($Spoke{spoke_idx}Subnet{subnet_idx}Cidr)" -ForegroundColor Gray\n\n'

            spoke_subnet_config_list = ', '.join([f'$Spoke{spoke_idx}SubnetConfig{si}' for si in range(1, len(spoke['subnets']) + 1)])

            spoke_vnet_creation += f'Write-Host "Creating Spoke {spoke_idx} Virtual Network: $Spoke{spoke_idx}VNetName" -ForegroundColor Cyan\n'
            spoke_vnet_creation += f'try {{\n'
            spoke_vnet_creation += f'    $spoke{spoke_idx}Vnet = New-AzVirtualNetwork `\n'
            spoke_vnet_creation += f'        -Name $Spoke{spoke_idx}VNetName `\n'
            spoke_vnet_creation += f'        -ResourceGroupName $ResourceGroupName `\n'
            spoke_vnet_creation += f'        -Location $Location `\n'
            spoke_vnet_creation += f'        -AddressPrefix $Spoke{spoke_idx}VNetCidr `\n'
            spoke_vnet_creation += f'        -Subnet {spoke_subnet_config_list} `\n'
            spoke_vnet_creation += f'        -Tag $Tags\n'
            spoke_vnet_creation += f'    Write-Host "✓ Spoke {spoke_idx} Virtual Network created successfully" -ForegroundColor Green\n'
            spoke_vnet_creation += f'}}\n'
            spoke_vnet_creation += f'catch {{\n'
            spoke_vnet_creation += f'    Write-Error "Failed to create Spoke {spoke_idx} Virtual Network: $_"\n'
            spoke_vnet_creation += f'    exit 1\n'
            spoke_vnet_creation += f'}}\n\n'

        vnet_peering += '\n# ========================================\n'
        vnet_peering += '# Create VNET Peering\n'
        vnet_peering += '# ========================================\n\n'

        for spoke_idx, spoke in enumerate(spoke_vnets, 1):
            vnet_peering += f'Write-Host "Creating peering from Hub to Spoke {spoke_idx}" -ForegroundColor Cyan\n'
            vnet_peering += f'try {{\n'
            vnet_peering += f'    Add-AzVirtualNetworkPeering `\n'
            vnet_peering += f'        -Name "hub-to-spoke{spoke_idx}" `\n'
            vnet_peering += f'        -VirtualNetwork $vnet `\n'
            vnet_peering += f'        -RemoteVirtualNetworkId $spoke{spoke_idx}Vnet.Id\n'
            vnet_peering += f'    Write-Host "✓ Peering from Hub to Spoke {spoke_idx} created" -ForegroundColor Green\n'
            vnet_peering += f'}}\n'
            vnet_peering += f'catch {{\n'
            vnet_peering += f'    Write-Error "Failed to create peering from Hub to Spoke {spoke_idx}: $_"\n'
            vnet_peering += f'}}\n\n'

            vnet_peering += f'Write-Host "Creating peering from Spoke {spoke_idx} to Hub" -ForegroundColor Cyan\n'
            vnet_peering += f'try {{\n'
            vnet_peering += f'    Add-AzVirtualNetworkPeering `\n'
            vnet_peering += f'        -Name "spoke{spoke_idx}-to-hub" `\n'
            vnet_peering += f'        -VirtualNetwork $spoke{spoke_idx}Vnet `\n'
            vnet_peering += f'        -RemoteVirtualNetworkId $vnet.Id\n'
            vnet_peering += f'    Write-Host "✓ Peering from Spoke {spoke_idx} to Hub created" -ForegroundColor Green\n'
            vnet_peering += f'}}\n'
            vnet_peering += f'catch {{\n'
            vnet_peering += f'    Write-Error "Failed to create peering from Spoke {spoke_idx} to Hub: $_"\n'
            vnet_peering += f'}}\n\n'

    # Replace placeholders
    content = content.replace('{{vnetCidr}}', data['vnetCidr'])
    content = content.replace('{{subnetVariables}}', subnet_variables)
    content = content.replace('{{subnetConfigurations}}', subnet_configurations)
    content = content.replace('{{subnetConfigList}}', subnet_config_list)
    content = content.replace('{{spokeVnetVariables}}', spoke_vnet_variables)
    content = content.replace('{{spokeVnetCreation}}', spoke_vnet_creation)
    content = content.replace('{{vnetPeering}}', vnet_peering)

    return content


def process_aws_cli_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process AWS CLI template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vpcCidr/vnetCidr, subnets

    Returns:
        Processed AWS CLI script
    """
    content = template_content

    # AWS uses vpcCidr, but data might have vnetCidr
    vpc_cidr = data.get('vpcCidr', data.get('vnetCidr', ''))

    # Generate subnet variables
    subnet_variables = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_variables += f'SUBNET{idx}_CIDR="{subnet["cidr"]}"\n'

    # Generate subnet creation commands
    subnet_creation = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        az_index = idx - 1
        subnet_creation += f'# Determine AZ for Subnet {idx}\n'
        subnet_creation += f'SUBNET{idx}_AZ="${{AVAILABILITY_ZONES[{az_index} % ${{AZ_COUNT}}]}}"\n'
        subnet_creation += f'echo "Creating Subnet {idx} in ${{SUBNET{idx}_AZ}}..."\n'
        subnet_creation += f'SUBNET{idx}_ID=$(aws ec2 create-subnet \\\n'
        subnet_creation += f'  --vpc-id "${{VPC_ID}}" \\\n'
        subnet_creation += f'  --cidr-block "${{SUBNET{idx}_CIDR}}" \\\n'
        subnet_creation += f'  --availability-zone "${{SUBNET{idx}_AZ}}" \\\n'
        subnet_creation += f'  --region "${{REGION}}" \\\n'
        subnet_creation += f'  --tag-specifications "ResourceType=subnet,Tags=[{{Key=Name,Value=${{PREFIX}}-subnet{idx}}}]" \\\n'
        subnet_creation += f'  --query \'Subnet.SubnetId\' \\\n'
        subnet_creation += f'  --output text)\n\n'
        subnet_creation += f'echo "Subnet {idx} ID: ${{SUBNET{idx}_ID}}"\n\n'

    # Replace placeholders
    content = content.replace('{{vpcCidr}}', vpc_cidr)
    content = content.replace('{{subnetVariables}}', subnet_variables)
    content = content.replace('{{subnetCreation}}', subnet_creation)

    return content


def process_aws_cloudformation_template(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process AWS CloudFormation template.

    Args:
        template_content: Template file content with placeholders
        data: Dictionary with vpcCidr/vnetCidr, subnets

    Returns:
        Processed CloudFormation YAML code
    """
    content = template_content

    # AWS uses vpcCidr, but data might have vnetCidr
    vpc_cidr = data.get('vpcCidr', data.get('vnetCidr', ''))

    az_selectors = [
        '!Select [0, !GetAZs ""]',
        '!Select [1, !GetAZs ""]',
        '!Select [2, !GetAZs ""]',
    ]

    # Generate subnet parameters
    subnet_parameters = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_parameters += f'\n  Subnet{idx}Cidr:\n'
        subnet_parameters += f'    Type: String\n'
        subnet_parameters += f'    Default: \'{subnet["cidr"]}\'\n'
        subnet_parameters += f'    Description: CIDR block for Subnet {idx}\n'

    # Generate subnet resources with dynamic AZ selection
    subnet_resources = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        az_selector = az_selectors[(idx - 1) % len(az_selectors)]
        subnet_resources += f'\n  Subnet{idx}:\n'
        subnet_resources += f'    Type: AWS::EC2::Subnet\n'
        subnet_resources += f'    Properties:\n'
        subnet_resources += f'      VpcId: !Ref VPC\n'
        subnet_resources += f'      CidrBlock: !Ref Subnet{idx}Cidr\n'
        subnet_resources += f'      AvailabilityZone: {az_selector}\n'
        subnet_resources += f'      Tags:\n'
        subnet_resources += f'        - Key: Name\n'
        subnet_resources += f"          Value: !Sub '${{Prefix}}-subnet{idx}'\n"
        subnet_resources += f'        - Key: Environment\n'
        subnet_resources += f'          Value: Production\n'
        subnet_resources += f'        - Key: ManagedBy\n'
        subnet_resources += f'          Value: CloudFormation\n'

    # Generate subnet outputs
    subnet_outputs = ''
    for idx, subnet in enumerate(data['subnets'], 1):
        subnet_outputs += f'\n  Subnet{idx}Id:\n'
        subnet_outputs += f'    Description: ID of Subnet {idx}\n'
        subnet_outputs += f'    Value: !Ref Subnet{idx}\n'
        subnet_outputs += f'    Export:\n'
        subnet_outputs += f"      Name: !Sub '${{AWS::StackName}}-Subnet{idx}Id'\n"

    # Replace placeholders
    content = content.replace('{{vpcCidr}}', vpc_cidr)
    content = content.replace('{{subnetParameters}}', subnet_parameters)
    content = content.replace('{{subnetResources}}', subnet_resources)
    content = content.replace('{{subnetOutputs}}', subnet_outputs)

    return content


def process_template(provider: str, output_format: str, data: Dict[str, Any], templates_dir: str) -> str:
    """
    Process a template for a given provider and output format.

    Args:
        provider: Cloud provider (azure, aws, gcp, etc.)
        output_format: Output format (terraform, bicep, arm, etc.)
        data: Data to populate template
        templates_dir: Directory containing templates

    Returns:
        Processed template content
    """
    # Map output format to template file
    template_map = {
        'terraform': 'terraform.template.tf',
        'bicep': 'bicep.template.bicep',
        'arm': 'arm.template.json',
        'powershell': 'powershell.template.ps1',
        'cli': 'cli.template.sh',
        'cloudformation': 'cloudformation.template.yaml',
        'gcloud': 'gcloud.template.sh',
        'oci': 'oci.template.sh',
        'aliyun': 'aliyun.template.sh'
    }

    template_file = template_map.get(output_format)
    if not template_file:
        raise ValueError(f"Unsupported output format: {output_format}")

    template_path = os.path.join(templates_dir, provider, template_file)

    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found: {template_path}")

    template_content = load_template(template_path)

    # Process template based on provider and format
    if provider == 'azure':
        if output_format == 'terraform':
            return process_azure_terraform_template(template_content, data)
        elif output_format == 'cli':
            return process_azure_cli_template(template_content, data)
        elif output_format == 'bicep':
            return process_azure_bicep_template(template_content, data)
        elif output_format == 'arm':
            return process_azure_arm_template(template_content, data)
        elif output_format == 'powershell':
            return process_azure_powershell_template(template_content, data)
    elif provider == 'aws':
        if output_format == 'terraform':
            return process_aws_terraform_template(template_content, data)
        elif output_format == 'cli':
            return process_aws_cli_template(template_content, data)
        elif output_format == 'cloudformation':
            return process_aws_cloudformation_template(template_content, data)

    raise NotImplementedError(f"Template processor not implemented for {provider}/{output_format}")
