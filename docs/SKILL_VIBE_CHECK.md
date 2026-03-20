# Skill Vibe Check: `ipcalc-for-cloud`

Date: 2026-03-12

## Summary

The Python scripts are solid — clean, deterministic, well-structured. The core IP math is sound. The SKILL.md has good bones (objective, workflow, validation, anti-patterns, examples) but has several issues that could cause Claude to behave incorrectly or inconsistently.

---

## Issues Found

### 1. Quick start shows slash command syntax — wrong paradigm

The `<quick_start>` section shows invocations like:
```
/ipcalc-for-cloud "azure, 10.0.0.0/16, 4 subnets"
```
This is slash command syntax. This is a **skill**, so Claude triggers it from natural language. The quick start should show what the *user* says, not a command invocation.

### 2. Gap between documented and implemented features

The SKILL.md implies all providers support all output formats (Bicep, ARM, PowerShell, CloudFormation, gcloud, OCI, Aliyun CLI). But `USAGE.md` explicitly marks many of these as "Planned". Claude will confidently try to generate output that the script will reject with an error.

### 3. Script path may break in some contexts

Step 2 hardcodes:
```
~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py
```
This assumes the skill is always symlinked at `~/.claude/skills/`. If installed from a plugin cache or a different location, the path will fail silently. Consider making the path skill-directory-aware or at least documenting the assumption clearly.

### 4. Hub-spoke restriction not surfaced early

Hub-spoke is only supported for **Azure and GCP** — this is enforced in the script but barely mentioned in the SKILL.md. Claude may attempt hub-spoke for AWS/Oracle/AliCloud and hit a confusing error. The workflow section should surface this restriction prominently.

### 5. SKILL.md is 533 lines — slightly over budget

The 500-line target exists for a reason. The `<scripts_reference>` and `<templates_reference>` sections are detailed but only useful when Claude is writing code. These could move to a `references/` file loaded on demand, keeping the main skill leaner.

### 6. AWS availability zones hardcoded to `us-east-1`

In `cloud_provider_config.py`, AWS AZs are:
```python
['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f']
```
If a user generates Terraform for `eu-west-1`, the output will contain wrong AZ names. Claude cannot know this without reading the source — the SKILL.md should mention this limitation so Claude can warn users.

---

## What's Working Well

- Core Python scripts: clean, deterministic, no external dependencies
- `<objective>` sets clear scope
- `<workflow>` gives Claude a reliable execution path
- `<examples>` provide concrete mental models
- `<anti_patterns>` proactively guide Claude away from common mistakes
- `<validation>` and `<success_criteria>` are thorough

---

## Proposed Improvements (Priority Order)

| Priority | Area | Change |
|---|---|---|
| High | Quick start | Replace slash-command examples with natural language triggers |
| High | Scope honesty | Clearly state which providers/formats are fully implemented vs. planned |
| High | Hub-spoke restriction | Surface Azure/GCP-only limitation prominently in workflow |
| Medium | Script path | Document the `~/.claude/skills/` symlink assumption explicitly |
| Medium | AWS AZ caveat | Note that AZs default to `us-east-1` and need user customization |
| Low | Length | Move `<scripts_reference>` and `<templates_reference>` to `references/` file |
| Low | Description | Optimize the trigger description for better skill activation reliability |

---

## Suggested Test Cases

These cover the major execution paths and are useful for evaluating any revised version:

1. **Basic info** — *"I need to plan a network for Azure, using 10.0.0.0/16 with 6 subnets. Show me the allocation."*
2. **IaC generation** — *"Generate Terraform for an AWS VPC with CIDR 172.16.0.0/12, split into 8 subnets across availability zones."*
3. **Hub-spoke** — *"I'm setting up a hub-spoke in Azure. Hub is 10.0.0.0/16 with 3 subnets, two spokes at 10.1.0.0/16 and 10.2.0.0/16 each with 2 subnets. Give me Terraform."*
4. **Custom prefix / edge case** — *"Plan a GCP network: 192.168.0.0/20, 4 subnets, use /24 prefix so I leave room to grow. Show me the info table."*

---

## Next Steps Options

- **Option A**: Apply structural fixes to SKILL.md now (vibe-driven edits based on issues above)
- **Option B**: Run the full eval framework first — test current skill vs. no-skill baseline, then improve based on observed Claude behavior
- **Option C**: Do both — fix the obvious issues first, then run evals to catch subtler problems
