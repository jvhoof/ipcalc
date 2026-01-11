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
    if provider == 'azure' and output_format == 'terraform':
        return process_azure_terraform_template(template_content, data)
    elif provider == 'aws' and output_format == 'terraform':
        return process_aws_terraform_template(template_content, data)
    else:
        # For other formats, implement as needed
        raise NotImplementedError(f"Template processor not implemented for {provider}/{output_format}")
