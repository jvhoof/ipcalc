---
name: ipcalc-for-cloud
description: Calculates IP ranges, CIDR blocks, and subnet allocations for cloud networks (Azure, AWS, GCP, Oracle, AliCloud). Supports single VNet/VPC or hub-spoke topologies with automatic AZ distribution. Outputs as info tables, JSON, or IaC templates (Terraform, Bicep, ARM, PowerShell, CloudFormation). Use for network planning, IP calculations, CIDR notation, or infrastructure as code generation.
allowed-tools: Bash(python *), Bash(terraform *), Bash(az *), Bash(aws *)
---

<objective>
Calculate IP ranges, CIDR blocks, and subnet allocations for cloud network planning. This skill:
- Performs CIDR subnet calculations and splitting for cloud providers
- Creates single VNet/VPC with multiple subnets OR hub-spoke topologies
- Validates IP ranges and detects overlaps
- Automatically assigns optimal CIDR blocks or uses custom subnet prefixes
- Distributes subnets across availability zones (AWS, GCP, AliCloud)
- Calculates provider-specific reserved IPs and usable ranges
- Outputs results as formatted tables, JSON, or IaC templates

Supported Cloud Providers: Azure, AWS, GCP, Oracle Cloud, AliCloud, On-Premises

Uses Python for deterministic IP calculations matching the TypeScript CLI implementation.
</objective>

<quick_start>
Users ask for IP calculations and subnet planning in natural language. Examples of how users will phrase requests:

**Show network information**:
> "Calculate 4 subnets for Azure, base CIDR 10.0.0.0/16"

**Generate Terraform for AWS**:
> "Give me Terraform for an AWS VPC at 10.0.0.0/16 with 3 subnets"

**Custom subnet prefix** (to avoid filling entire network):
> "Plan 4 subnets for Azure 172.16.1.0/24 using /26 prefix"

**Hub-spoke topology for Azure**:
> "Create an Azure hub-spoke with hub 10.0.0.0/16 (2 subnets), spokes at 10.1.0.0/16 and 10.2.0.0/16 (2 subnets each), output Terraform"
</quick_start>

<workflow>
## Step 1: Parse Input Specifications

Accept user input specifying:
- **Cloud provider**: azure, aws, gcp, oracle, alicloud, onpremises
- **Base CIDR**: Network CIDR block (e.g., "10.0.0.0/16")
- **Number of subnets**: How many subnets to create (1-256)
- **Output format**: depends on provider (see mapping below); `info` and `json` work for all providers
  - Azure: `terraform`, `bicep`, `arm`, `powershell`, `cli`
  - AWS: `terraform`, `cloudformation`, `cli`
  - GCP: `terraform`, `gcloud`
  - Oracle: `terraform`, `oci`
  - AliCloud: `terraform`, `aliyun`
  - On-Premises: *(info and json only)*
- **Optional - Custom prefix**: Desired subnet prefix (e.g., /26) to override auto-calculation
- **Optional - Hub-spoke**: Spoke network CIDRs and subnet counts for hub-spoke topology
  > **Hub-spoke is only supported for Azure and GCP.** If the user requests hub-spoke for AWS, Oracle, AliCloud, or On-Premises, explain the limitation and suggest using a single VNet/VPC instead.

If the user requests a format not supported by their chosen provider, inform them and suggest the closest available alternative (e.g., use `terraform` or `info` instead).

## Step 2: Run IP Calculations

> **Path assumption**: The script path `~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py` assumes this skill is installed or symlinked at `~/.claude/skills/ipcalc-for-cloud/`. If the script is not found, inform the user and ask them to confirm the installation path.

Execute the IP calculation script with cloud provider configuration:

```bash
python ~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 4 \
  --output terraform
```

**With custom subnet prefix**:
```bash
python ~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py \
  --provider azure \
  --cidr "172.16.1.0/24" \
  --subnets 4 \
  --prefix 26 \
  --output info
```

**With hub-spoke topology**:
```bash
python ~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 2 \
  --spoke-cidrs "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16" \
  --spoke-subnets "2,2,2" \
  --output terraform
```

The script validates CIDR, calculates optimal subnets, distributes across AZs, applies provider-specific reserved IP counts (Azure: 5, AWS: 5, GCP: 4, Oracle: 3, AliCloud: 4), detects overlaps, and renders the requested output format.

## Step 3: Output Results

**Info format** (default): Human-readable table with network details, subnet CIDRs, AZ assignments, reserved and usable IP counts.

**JSON format**: Structured JSON with complete network and subnet data; machine-readable for integration.

**Terraform format**: HCL with provider config, variables, network/subnet resources, outputs, hub-spoke peering (if applicable), and IP allocation comments.

**Other IaC formats** (all fully implemented):
- **Bicep** *(Azure only)*: Azure Bicep template with inline subnets
- **ARM** *(Azure only)*: Azure Resource Manager JSON template
- **PowerShell** *(Azure only)*: Azure PowerShell script with cmdlets
- **CloudFormation** *(AWS only)*: AWS YAML template with intrinsic functions
- **CLI** *(Azure, AWS)*: Bash scripts with az/aws commands
- **gcloud** *(GCP only)*: gcloud CLI commands
- **OCI** *(Oracle only)*: OCI CLI commands
- **Aliyun** *(AliCloud only)*: Aliyun CLI commands

## Step 4: Validate Output

- IP range validation: no overlaps, proper nesting, valid CIDR notation
- Provider constraint validation (prefix limits)
- Capacity validation: requested subnets fit in network
- For Terraform: syntax validation if terraform CLI available (`terraform init && terraform validate`)
- For hub-spoke: peering configuration correctness
</workflow>

<examples>
<example number="1">
<input>
User: "Calculate IP allocation for Azure with 10.0.0.0/16 and 4 subnets"
</input>
<process>
1. Parse: provider=azure, cidr=10.0.0.0/16, subnets=4, output=info (default)
2. Run: python ~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py --provider azure --cidr "10.0.0.0/16" --subnets 4
3. Script calculates /18 subnets (4 subnets × 16,384 IPs), assigns Azure AZs 1/2/3/1, applies 5 reserved IPs per subnet
</process>
<output>
Formatted table: network address, CIDR, total IPs; each subnet with CIDR, usable IPs, usable range, AZ, reserved IPs
</output>
</example>

<example number="2">
<input>
User: "Azure hub-spoke with hub 10.0.0.0/16 (2 subnets), spokes 10.1.0.0/16 and 10.2.0.0/16 (2 subnets each), Terraform output"
</input>
<process>
1. Parse: provider=azure, hub_cidr=10.0.0.0/16, hub_subnets=2, spoke_cidrs=[10.1.0.0/16, 10.2.0.0/16], spoke_subnets=[2,2], output=terraform
2. Run: python ~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py --provider azure --cidr "10.0.0.0/16" --subnets 2 --spoke-cidrs "10.1.0.0/16,10.2.0.0/16" --spoke-subnets "2,2" --output terraform
</process>
<output>
Terraform with hub VNet + subnets, 2 spoke VNets + subnets, bidirectional peering (hub↔spoke1, hub↔spoke2), outputs for all resource IDs
</output>
</example>
</examples>

<validation>
**IP Range**:
- All subnets fit within parent network, no overlaps, valid CIDR notation
- Provider prefix limits: Azure /8–/29, AWS /16–/28, GCP /8–/29, Oracle /16–/30, AliCloud /8–/29

**IaC output checklist**:
- [ ] Provider configuration present with correct version
- [ ] Variables defined for customization (region, prefix, CIDRs)
- [ ] Output variables defined for resource IDs
- [ ] Hub-spoke peering complete and bidirectional (if applicable)
- [ ] IP allocation table in comments
</validation>

<anti_patterns>
<pitfall name="filling_entire_network">
❌ Auto-calculating subnet size fills entire network, no room for growth
✅ Use `--prefix` to specify smaller subnets, leave address space for future
</pitfall>

<pitfall name="ignoring_provider_constraints">
❌ Requesting /30 subnets in AWS (minimum is /28)
✅ Check provider min/max CIDR prefixes before planning
</pitfall>

<pitfall name="uneven_az_distribution">
❌ All subnets in single availability zone
✅ Use automatic AZ distribution (AWS, GCP, AliCloud) for high availability
</pitfall>

<pitfall name="incorrect_reserved_ips">
❌ Assuming standard 2 reserved IPs (network + broadcast)
✅ Use provider-specific reserved counts (Azure: 5, AWS: 5, GCP: 4, Oracle: 3, AliCloud: 4)
</pitfall>

<pitfall name="missing_hub_spoke_peering">
❌ Creating hub and spoke VNets without peering configuration
✅ Use `--spoke-cidrs` to automatically generate bidirectional peering
</pitfall>
</anti_patterns>

<success_criteria>
- IP calculations are mathematically correct and deterministic
- Provider constraints enforced (CIDR prefix limits, reserved IPs)
- Subnets fit within parent network with no overlaps
- AZ distribution applied for AWS, GCP, AliCloud
- Hub-spoke: bidirectional peering configured, no overlapping CIDRs
- IaC: passes syntax validation, variables and outputs present

For script and template internals, read `references/internals.md`.
</success_criteria>
