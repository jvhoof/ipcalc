/**
 * Template Loader for Node.js CLI
 * Uses fs.readFileSync instead of dynamic imports
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface Subnet {
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

interface TemplateData {
  vnetCidr: string
  subnets: Subnet[]
}

function loadTemplate(relativePath: string): string {
  const templatePath = join(__dirname, '..', 'templates', relativePath)
  return readFileSync(templatePath, 'utf-8')
}

/**
 * Azure CLI Template
 */
export function loadAzureCLITemplate(data: TemplateData): string {
  let content = loadTemplate('azure/cli.template.sh')

  // Generate subnet variables
  let subnetVariables = ''
  data.subnets.forEach((subnet, index) => {
    subnetVariables += 'SUBNET' + (index + 1) + '_NAME="${PREFIX}-subnet' + (index + 1) + '"\n'
    subnetVariables += 'SUBNET' + (index + 1) + '_CIDR="' + subnet.cidr + '"\n'
  })

  // Generate subnet creation commands
  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += 'echo "Creating Subnet ' + (index + 1) + ': ${SUBNET' + (index + 1) + '_NAME}"\n'
    subnetCreation += 'az network vnet subnet create \\\n'
    subnetCreation += '  --resource-group "${RESOURCE_GROUP}" \\\n'
    subnetCreation += '  --vnet-name "${VNET_NAME}" \\\n'
    subnetCreation += '  --name "${SUBNET' + (index + 1) + '_NAME}" \\\n'
    subnetCreation += '  --address-prefix "${SUBNET' + (index + 1) + '_CIDR}"\n\n'
  })

  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

/**
 * Azure Terraform Template
 */
export function loadAzureTerraformTemplate(data: TemplateData): string {
  let content = loadTemplate('azure/terraform.template.tf')

  let subnetVariables = ''
  let subnetResources = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    subnetVariables += '\nvariable "subnet' + (index + 1) + '_cidr" {\n'
    subnetVariables += '  description = "CIDR block for Subnet ' + (index + 1) + '"\n'
    subnetVariables += '  type        = string\n'
    subnetVariables += '  default     = "' + subnet.cidr + '"\n'
    subnetVariables += '}\n'

    subnetResources += 'resource "azurerm_subnet" "subnet' + (index + 1) + '" {\n'
    subnetResources += '  name                 = "${var.prefix}-subnet' + (index + 1) + '"\n'
    subnetResources += '  resource_group_name  = azurerm_resource_group.rg.name\n'
    subnetResources += '  virtual_network_name = azurerm_virtual_network.vnet.name\n'
    subnetResources += '  address_prefixes     = [var.subnet' + (index + 1) + '_cidr]\n'
    subnetResources += '}\n\n'

    subnetOutputs += '\noutput "subnet' + (index + 1) + '_id" {\n'
    subnetOutputs += '  description = "ID of Subnet ' + (index + 1) + '"\n'
    subnetOutputs += '  value       = azurerm_subnet.subnet' + (index + 1) + '.id\n'
    subnetOutputs += '}\n'
  })

  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Azure Bicep Template
 */
export function loadAzureBicepTemplate(data: TemplateData): string {
  let content = loadTemplate('azure/bicep.template.bicep')

  let subnetParameters = ''
  let subnetDefinitions = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    subnetParameters += '\n@description(\'CIDR block for Subnet ' + (index + 1) + '\')\n'
    subnetParameters += 'param subnet' + (index + 1) + 'Cidr string = \'' + subnet.cidr + '\'\n'

    subnetDefinitions += '    {\n'
    subnetDefinitions += '      name: \'${prefix}-subnet' + (index + 1) + '\'\n'
    subnetDefinitions += '      properties: {\n'
    subnetDefinitions += '        addressPrefix: subnet' + (index + 1) + 'Cidr\n'
    subnetDefinitions += '      }\n'
    subnetDefinitions += '    }\n'
    if (index < data.subnets.length - 1) {
      subnetDefinitions += '    '
    }

    subnetOutputs += '\noutput subnet' + (index + 1) + 'Id string = vnet.properties.subnets[' + index + '].id\n'
  })

  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetDefinitions}}', subnetDefinitions)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Azure ARM Template
 */
export function loadAzureARMTemplate(data: TemplateData): string {
  let content = loadTemplate('azure/arm.template.json')

  let subnetParameters = ''
  let subnetVariables = ''
  let subnetDefinitions = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    const comma = index < data.subnets.length - 1 ? ',' : ''

    subnetParameters += ',\n    "subnet' + (index + 1) + 'Cidr": {\n'
    subnetParameters += '      "type": "string",\n'
    subnetParameters += '      "defaultValue": "' + subnet.cidr + '",\n'
    subnetParameters += '      "metadata": {\n'
    subnetParameters += '        "description": "CIDR block for Subnet ' + (index + 1) + '"\n'
    subnetParameters += '      }\n'
    subnetParameters += '    }'

    subnetVariables += ',\n    "subnet' + (index + 1) + 'Name": "[concat(parameters(\'prefix\'), \'-subnet' + (index + 1) + '\')]"'

    if (index > 0) subnetDefinitions += ','
    subnetDefinitions += '\n          {\n'
    subnetDefinitions += '            "name": "[variables(\'subnet' + (index + 1) + 'Name\')]",\n'
    subnetDefinitions += '            "properties": {\n'
    subnetDefinitions += '              "addressPrefix": "[parameters(\'subnet' + (index + 1) + 'Cidr\')]"\n'
    subnetDefinitions += '            }\n'
    subnetDefinitions += '          }'

    subnetOutputs += ',\n    "subnet' + (index + 1) + 'Id": {\n'
    subnetOutputs += '      "type": "string",\n'
    subnetOutputs += '      "value": "[resourceId(\'Microsoft.Network/virtualNetworks/subnets\', variables(\'vnetName\'), variables(\'subnet' + (index + 1) + 'Name\'))]"\n'
    subnetOutputs += '    }'
  })

  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetDefinitions}}', subnetDefinitions)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

/**
 * Azure PowerShell Template
 */
export function loadAzurePowerShellTemplate(data: TemplateData): string {
  let content = loadTemplate('azure/powershell.template.ps1')

  let subnetVariables = ''
  let subnetConfigurations = ''
  let subnetConfigList = ''

  data.subnets.forEach((subnet, index) => {
    subnetVariables += '$subnet' + (index + 1) + 'Cidr = "' + subnet.cidr + '"\n'

    subnetConfigurations += '$subnet' + (index + 1) + 'Config = New-AzVirtualNetworkSubnetConfig `\n'
    subnetConfigurations += '  -Name "$prefix-subnet' + (index + 1) + '" `\n'
    subnetConfigurations += '  -AddressPrefix $subnet' + (index + 1) + 'Cidr\n\n'

    subnetConfigList += '$subnet' + (index + 1) + 'Config'
    if (index < data.subnets.length - 1) {
      subnetConfigList += ', '
    }
  })

  content = content.replace('{{vnetCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetConfigurations}}', subnetConfigurations)
  content = content.replace('{{subnetConfigList}}', subnetConfigList)

  return content
}

// AWS Templates
export function loadAWSCLITemplate(data: TemplateData): string {
  let content = loadTemplate('aws/cli.template.sh')

  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += 'echo "Creating Subnet ' + (index + 1) + ' in ' + (subnet.availabilityZone || 'us-east-1a') + '..."\n'
    subnetCreation += 'SUBNET' + (index + 1) + '_ID=$(aws ec2 create-subnet \\\n'
    subnetCreation += '  --vpc-id $VPC_ID \\\n'
    subnetCreation += '  --cidr-block "' + subnet.cidr + '" \\\n'
    subnetCreation += '  --availability-zone "' + (subnet.availabilityZone || 'us-east-1a') + '" \\\n'
    subnetCreation += '  --tag-specifications \'ResourceType=subnet,Tags=[{Key=Name,Value=\'$VPC_NAME\'-subnet' + (index + 1) + '}]\' \\\n'
    subnetCreation += '  --query \'Subnet.SubnetId\' \\\n'
    subnetCreation += '  --output text)\n\n'
    subnetCreation += 'echo "Subnet ' + (index + 1) + ' created with ID: $SUBNET' + (index + 1) + '_ID"\n\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

export function loadAWSTerraformTemplate(data: TemplateData): string {
  let content = loadTemplate('aws/terraform.template.tf')

  let subnetVariables = ''
  let subnetResources = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    subnetVariables += '\nvariable "subnet' + (index + 1) + '_cidr" {\n'
    subnetVariables += '  description = "CIDR block for Subnet ' + (index + 1) + '"\n'
    subnetVariables += '  type        = string\n'
    subnetVariables += '  default     = "' + subnet.cidr + '"\n'
    subnetVariables += '}\n'

    subnetVariables += '\nvariable "subnet' + (index + 1) + '_az" {\n'
    subnetVariables += '  description = "Availability Zone for Subnet ' + (index + 1) + '"\n'
    subnetVariables += '  type        = string\n'
    subnetVariables += '  default     = "' + (subnet.availabilityZone || 'us-east-1a') + '"\n'
    subnetVariables += '}\n'

    subnetResources += 'resource "aws_subnet" "subnet' + (index + 1) + '" {\n'
    subnetResources += '  vpc_id            = aws_vpc.vpc.id\n'
    subnetResources += '  cidr_block        = var.subnet' + (index + 1) + '_cidr\n'
    subnetResources += '  availability_zone = var.subnet' + (index + 1) + '_az\n\n'
    subnetResources += '  tags = {\n'
    subnetResources += '    Name        = "${aws_vpc.vpc.name}-subnet' + (index + 1) + '"\n'
    subnetResources += '    Environment = "Production"\n'
    subnetResources += '    ManagedBy   = "Terraform"\n'
    subnetResources += '  }\n'
    subnetResources += '}\n\n'

    subnetOutputs += '\noutput "subnet' + (index + 1) + '_id" {\n'
    subnetOutputs += '  description = "ID of Subnet ' + (index + 1) + '"\n'
    subnetOutputs += '  value       = aws_subnet.subnet' + (index + 1) + '.id\n'
    subnetOutputs += '}\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

export function loadAWSCloudFormationTemplate(data: TemplateData): string {
  let content = loadTemplate('aws/cloudformation.template.yaml')

  let subnetParameters = ''
  let subnetResources = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    subnetParameters += '  Subnet' + (index + 1) + 'CIDR:\n'
    subnetParameters += '    Type: String\n'
    subnetParameters += '    Default: \'' + subnet.cidr + '\'\n'
    subnetParameters += '    Description: CIDR block for Subnet ' + (index + 1) + '\n'
    subnetParameters += '  Subnet' + (index + 1) + 'AZ:\n'
    subnetParameters += '    Type: AWS::EC2::AvailabilityZone::Name\n'
    subnetParameters += '    Default: \'' + (subnet.availabilityZone || 'us-east-1a') + '\'\n'
    subnetParameters += '    Description: Availability Zone for Subnet ' + (index + 1) + '\n'

    subnetResources += '  Subnet' + (index + 1) + ':\n'
    subnetResources += '    Type: AWS::EC2::Subnet\n'
    subnetResources += '    Properties:\n'
    subnetResources += '      VpcId: !Ref VPC\n'
    subnetResources += '      CidrBlock: !Ref Subnet' + (index + 1) + 'CIDR\n'
    subnetResources += '      AvailabilityZone: !Ref Subnet' + (index + 1) + 'AZ\n'
    subnetResources += '      MapPublicIpOnLaunch: true\n'
    subnetResources += '      Tags:\n'
    subnetResources += '        - Key: Name\n'
    subnetResources += '          Value: !Sub \'${VPCName}-subnet' + (index + 1) + '\'\n'
    subnetResources += '        - Key: Environment\n'
    subnetResources += '          Value: Production\n'
    subnetResources += '        - Key: ManagedBy\n'
    subnetResources += '          Value: CloudFormation\n'

    subnetOutputs += '  Subnet' + (index + 1) + 'Id:\n'
    subnetOutputs += '    Description: ID of Subnet ' + (index + 1) + '\n'
    subnetOutputs += '    Value: !Ref Subnet' + (index + 1) + '\n'
    subnetOutputs += '    Export:\n'
    subnetOutputs += '      Name: !Sub \'${AWS::StackName}-Subnet' + (index + 1) + 'Id\'\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetParameters}}', subnetParameters)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

// GCP Templates
export function loadGCPGcloudTemplate(data: TemplateData): string {
  let content = loadTemplate('gcp/gcloud.template.sh')

  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += 'echo "Creating Subnet ' + (index + 1) + ' in ' + (subnet.region || 'us-central1') + '..."\n'
    subnetCreation += 'gcloud compute networks subnets create "${VPC_NAME}-subnet' + (index + 1) + '" \\\n'
    subnetCreation += '  --network="$VPC_NAME" \\\n'
    subnetCreation += '  --region="' + (subnet.region || 'us-central1') + '" \\\n'
    subnetCreation += '  --range="' + subnet.cidr + '" \\\n'
    subnetCreation += '  --project="$PROJECT_ID"\n\n'
    subnetCreation += 'echo "Subnet ' + (index + 1) + ' created"\n\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

export function loadGCPTerraformTemplate(data: TemplateData): string {
  let content = loadTemplate('gcp/terraform.template.tf')

  let subnetVariables = ''
  let subnetResources = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    subnetVariables += '\nvariable "subnet' + (index + 1) + '_cidr" {\n'
    subnetVariables += '  description = "CIDR block for Subnet ' + (index + 1) + '"\n'
    subnetVariables += '  type        = string\n'
    subnetVariables += '  default     = "' + subnet.cidr + '"\n'
    subnetVariables += '}\n'

    subnetVariables += '\nvariable "subnet' + (index + 1) + '_region" {\n'
    subnetVariables += '  description = "Region for Subnet ' + (index + 1) + '"\n'
    subnetVariables += '  type        = string\n'
    subnetVariables += '  default     = "' + (subnet.region || 'us-central1') + '"\n'
    subnetVariables += '}\n'

    subnetResources += 'resource "google_compute_subnetwork" "subnet' + (index + 1) + '" {\n'
    subnetResources += '  name          = "${var.vpc_name}-subnet' + (index + 1) + '"\n'
    subnetResources += '  ip_cidr_range = var.subnet' + (index + 1) + '_cidr\n'
    subnetResources += '  region        = var.subnet' + (index + 1) + '_region\n'
    subnetResources += '  network       = google_compute_network.vpc.id\n\n'
    subnetResources += '  log_config {\n'
    subnetResources += '    aggregation_interval = "INTERVAL_10_MIN"\n'
    subnetResources += '    flow_sampling        = 0.5\n'
    subnetResources += '    metadata             = "INCLUDE_ALL_METADATA"\n'
    subnetResources += '  }\n'
    subnetResources += '}\n\n'

    subnetOutputs += '\noutput "subnet' + (index + 1) + '_id" {\n'
    subnetOutputs += '  description = "ID of Subnet ' + (index + 1) + '"\n'
    subnetOutputs += '  value       = google_compute_subnetwork.subnet' + (index + 1) + '.id\n'
    subnetOutputs += '}\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

// Oracle Templates
export function loadOracleOCITemplate(data: TemplateData): string {
  let content = loadTemplate('oracle/oci.template.sh')

  let subnetCreation = ''
  data.subnets.forEach((subnet, index) => {
    subnetCreation += 'echo "Creating Subnet ' + (index + 1) + '..."\n'
    subnetCreation += 'SUBNET' + (index + 1) + '_ID=$(oci network subnet create \\\n'
    subnetCreation += '  --compartment-id "${COMPARTMENT_ID}" \\\n'
    subnetCreation += '  --vcn-id "${VCN_ID}" \\\n'
    subnetCreation += '  --cidr-block "' + subnet.cidr + '" \\\n'
    subnetCreation += '  --display-name "${VCN_NAME}-subnet' + (index + 1) + '" \\\n'
    subnetCreation += '  --dns-label "subnet' + (index + 1) + '" \\\n'
    subnetCreation += '  --route-table-id "${RT_ID}" \\\n'
    subnetCreation += '  --security-list-ids \'["\'${SL_ID}\'"]\' \\\n'
    subnetCreation += '  --query \'data.id\' \\\n'
    subnetCreation += '  --raw-output)\n\n'
    subnetCreation += 'echo "Subnet ' + (index + 1) + ' created with ID: ${SUBNET' + (index + 1) + '_ID}"\n\n'
  })

  content = content.replace('{{vcnCidr}}', data.vnetCidr)
  content = content.replace('{{subnetCreation}}', subnetCreation)

  return content
}

export function loadOracleTerraformTemplate(data: TemplateData): string {
  let content = loadTemplate('oracle/terraform.template.tf')

  let subnetVariables = ''
  let subnetResources = ''
  let subnetOutputs = ''

  data.subnets.forEach((subnet, index) => {
    subnetVariables += '\nvariable "subnet' + (index + 1) + '_cidr" {\n'
    subnetVariables += '  description = "CIDR block for Subnet ' + (index + 1) + '"\n'
    subnetVariables += '  type        = string\n'
    subnetVariables += '  default     = "' + subnet.cidr + '"\n'
    subnetVariables += '}\n'

    subnetResources += 'resource "oci_core_subnet" "subnet' + (index + 1) + '" {\n'
    subnetResources += '  compartment_id             = var.compartment_id\n'
    subnetResources += '  vcn_id                     = oci_core_vcn.vcn.id\n'
    subnetResources += '  cidr_block                 = var.subnet' + (index + 1) + '_cidr\n'
    subnetResources += '  display_name               = "${var.vcn_name}-subnet' + (index + 1) + '"\n'
    subnetResources += '  dns_label                  = "subnet' + (index + 1) + '"\n'
    subnetResources += '  route_table_id             = oci_core_route_table.rt.id\n'
    subnetResources += '  security_list_ids          = [oci_core_security_list.sl.id]\n'
    subnetResources += '  prohibit_public_ip_on_vnic = false\n\n'
    subnetResources += '  freeform_tags = {\n'
    subnetResources += '    "Environment" = "Production"\n'
    subnetResources += '    "ManagedBy"   = "Terraform"\n'
    subnetResources += '  }\n'
    subnetResources += '}\n\n'

    subnetOutputs += '\noutput "subnet' + (index + 1) + '_id" {\n'
    subnetOutputs += '  description = "OCID of Subnet ' + (index + 1) + '"\n'
    subnetOutputs += '  value       = oci_core_subnet.subnet' + (index + 1) + '.id\n'
    subnetOutputs += '}\n'

    subnetOutputs += '\noutput "subnet' + (index + 1) + '_name" {\n'
    subnetOutputs += '  description = "Name of Subnet ' + (index + 1) + '"\n'
    subnetOutputs += '  value       = oci_core_subnet.subnet' + (index + 1) + '.display_name\n'
    subnetOutputs += '}\n'
  })

  content = content.replace('{{vcnCidr}}', data.vnetCidr)
  content = content.replace('{{subnetVariables}}', subnetVariables)
  content = content.replace('{{subnetResources}}', subnetResources)
  content = content.replace('{{subnetOutputs}}', subnetOutputs)

  return content
}

// AliCloud Templates
export function loadAliCloudAliyunTemplate(data: TemplateData): string {
  let content = loadTemplate('alicloud/aliyun.template.sh')

  let vSwitchCreation = ''
  data.subnets.forEach((subnet, index) => {
    vSwitchCreation += 'echo "Creating vSwitch ' + (index + 1) + ' in ' + (subnet.zone || 'cn-hangzhou-a') + '..."\n'
    vSwitchCreation += 'VSWITCH' + (index + 1) + '_ID=$(aliyun vpc CreateVSwitch \\\n'
    vSwitchCreation += '  --RegionId "${REGION}" \\\n'
    vSwitchCreation += '  --VpcId "${VPC_ID}" \\\n'
    vSwitchCreation += '  --ZoneId "' + (subnet.zone || 'cn-hangzhou-a') + '" \\\n'
    vSwitchCreation += '  --CidrBlock "' + subnet.cidr + '" \\\n'
    vSwitchCreation += '  --VSwitchName "${VPC_NAME}-vswitch' + (index + 1) + '" \\\n'
    vSwitchCreation += '  --Description "vSwitch ' + (index + 1) + ' for ' + (subnet.zone || 'cn-hangzhou-a') + '" \\\n'
    vSwitchCreation += '  --output cols=VSwitchId rows=VSwitchId \\\n'
    vSwitchCreation += '  | tail -n 1 | tr -d \' \')\n\n'
    vSwitchCreation += 'echo "vSwitch ' + (index + 1) + ' created with ID: ${VSWITCH' + (index + 1) + '_ID}"\n'
    vSwitchCreation += 'sleep 2\n\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{vSwitchCreation}}', vSwitchCreation)

  return content
}

export function loadAliCloudTerraformTemplate(data: TemplateData): string {
  let content = loadTemplate('alicloud/terraform.template.tf')

  let vSwitchVariables = ''
  let vSwitchResources = ''
  let vSwitchOutputs = ''

  data.subnets.forEach((subnet, index) => {
    vSwitchVariables += '\nvariable "vswitch' + (index + 1) + '_cidr" {\n'
    vSwitchVariables += '  description = "CIDR block for vSwitch ' + (index + 1) + '"\n'
    vSwitchVariables += '  type        = string\n'
    vSwitchVariables += '  default     = "' + subnet.cidr + '"\n'
    vSwitchVariables += '}\n'

    vSwitchVariables += '\nvariable "vswitch' + (index + 1) + '_zone" {\n'
    vSwitchVariables += '  description = "Availability Zone for vSwitch ' + (index + 1) + '"\n'
    vSwitchVariables += '  type        = string\n'
    vSwitchVariables += '  default     = "' + (subnet.zone || 'cn-hangzhou-a') + '"\n'
    vSwitchVariables += '}\n'

    vSwitchResources += 'resource "alicloud_vswitch" "vswitch' + (index + 1) + '" {\n'
    vSwitchResources += '  vpc_id       = alicloud_vpc.vpc.id\n'
    vSwitchResources += '  cidr_block   = var.vswitch' + (index + 1) + '_cidr\n'
    vSwitchResources += '  zone_id      = var.vswitch' + (index + 1) + '_zone\n'
    vSwitchResources += '  vswitch_name = "${var.vpc_name}-vswitch' + (index + 1) + '"\n'
    vSwitchResources += '  description  = "vSwitch ' + (index + 1) + ' in ${var.vswitch' + (index + 1) + '_zone}"\n\n'
    vSwitchResources += '  tags = {\n'
    vSwitchResources += '    Environment = "Production"\n'
    vSwitchResources += '    ManagedBy   = "Terraform"\n'
    vSwitchResources += '  }\n'
    vSwitchResources += '}\n\n'

    vSwitchOutputs += '\noutput "vswitch' + (index + 1) + '_id" {\n'
    vSwitchOutputs += '  description = "ID of vSwitch ' + (index + 1) + '"\n'
    vSwitchOutputs += '  value       = alicloud_vswitch.vswitch' + (index + 1) + '.id\n'
    vSwitchOutputs += '}\n'

    vSwitchOutputs += '\noutput "vswitch' + (index + 1) + '_name" {\n'
    vSwitchOutputs += '  description = "Name of vSwitch ' + (index + 1) + '"\n'
    vSwitchOutputs += '  value       = alicloud_vswitch.vswitch' + (index + 1) + '.vswitch_name\n'
    vSwitchOutputs += '}\n'

    vSwitchOutputs += '\noutput "vswitch' + (index + 1) + '_zone" {\n'
    vSwitchOutputs += '  description = "Zone of vSwitch ' + (index + 1) + '"\n'
    vSwitchOutputs += '  value       = alicloud_vswitch.vswitch' + (index + 1) + '.zone_id\n'
    vSwitchOutputs += '}\n'
  })

  content = content.replace('{{vpcCidr}}', data.vnetCidr)
  content = content.replace('{{vSwitchVariables}}', vSwitchVariables)
  content = content.replace('{{vSwitchResources}}', vSwitchResources)
  content = content.replace('{{vSwitchOutputs}}', vSwitchOutputs)

  return content
}
