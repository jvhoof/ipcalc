# ipcalc-for-cloud — Script & Template Internals

Reference for debugging or extending the skill. Not needed for normal use.

---

## scripts/ipcalc.py

Main IP calculator script supporting multiple cloud providers and output formats.

**Key Functions**:
- `calculate_subnets(cidr, num_subnets, provider, desired_prefix)` - Calculate subnet allocations
- `generate_hub_spoke_topology(hub_cidr, hub_subnets, spoke_cidrs, spoke_subnets, provider)` - Hub-spoke networks
- `calculate_network_info(network, provider_config)` - Detailed network information
- `format_network_info(cidr, subnets, provider)` - Human-readable output

**Options**:
- `--provider`: azure, aws, gcp, oracle, alicloud, onpremises
- `--cidr`: Network CIDR block
- `--subnets`: Number of subnets (1-256)
- `--prefix`: Optional custom subnet prefix
- `--output`: info, json, terraform, bicep, arm, powershell, cloudformation, cli, gcloud, oci, aliyun
- `--file`: Write output to file
- `--spoke-cidrs`: Comma-separated spoke VNet/VPC CIDRs
- `--spoke-subnets`: Comma-separated subnet counts per spoke

**JSON output structure**:
```json
{
  "vnetCidr": "10.0.0.0/16",
  "provider": "azure",
  "subnets": [
    {
      "name": "subnet1",
      "cidr": "10.0.0.0/18",
      "network": "10.0.0.0",
      "mask": "255.255.192.0",
      "total_ips": 16384,
      "usable_ips": 16379,
      "usable_range": "10.0.0.3 - 10.0.63.253",
      "availabilityZone": "1",
      "reserved": ["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.63.254", "10.0.63.255"]
    }
  ],
  "peeringEnabled": false
}
```

---

## scripts/cloud_provider_config.py

Provider-specific settings: reserved IP counts, CIDR prefix limits, AZ lists, supported output formats.

**Functions**:
- `get_cloud_provider_config(provider)` - Get provider configuration
- `validate_output_format(provider, output_format)` - Validate output format support
- `get_availability_zone(provider, index)` - Get AZ for subnet index (round-robin)

---

## scripts/ipcalc_legacy.py

Legacy version supporting old multi-VNet split behavior:
```bash
python scripts/ipcalc_legacy.py --base-cidr "10.0.0.0/16" --vnets 3 --subnets-per-vnet 4
```
Creates 3 separate VNets instead of 1 VNet with subnets.

---

## Template Architecture

Templates are organized by provider and format:
```
templates/
├── azure/
│   ├── terraform.template.tf
│   ├── bicep.template.bicep
│   ├── arm.template.json
│   ├── powershell.template.ps1
│   └── cli.template.sh
├── aws/
│   ├── terraform.template.tf
│   ├── cloudformation.template.yaml
│   └── cli.template.sh
└── ...
```

**Template Placeholders**:
- `{{vnetCidr}}` / `{{vpcCidr}}` - Network CIDR
- `{{subnetVariables}}` - Subnet variable declarations
- `{{subnetResources}}` - Subnet resource definitions
- `{{subnetOutputs}}` - Output definitions
- `{{spokeVnetResources}}` / `{{spokeVpcResources}}` - Spoke network resources
- `{{vnetPeeringResources}}` / `{{vpcPeeringResources}}` - Peering configurations

The template processor (`template_processor.py`) uses simple string replacement, maintaining output compatibility with the TypeScript CLI.
