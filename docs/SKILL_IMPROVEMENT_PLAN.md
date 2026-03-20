# Skill Improvement Plan: `ipcalc-for-cloud`

Based on: `docs/SKILL_VIBE_CHECK.md`
Date: 2026-03-12

---

## Overview

Six issues identified in the vibe check. Each item below is self-contained and can be worked on independently. Work through them in order — high priority first, low priority last.

---

## Item 1: Fix quick start section (slash command → natural language)

**Status**: [x] Done
**Priority**: High

**Problem**: The `<quick_start>` section shows `/ipcalc-for-cloud "..."` invocations, which is slash command syntax. This is a skill — Claude triggers it from natural language, not slash commands. The examples teach Claude the wrong mental model for how users will interact with it.

**Change**: Replace slash-command examples in `<quick_start>` with natural language phrasings that reflect how a real user would ask for each capability.

**File**: `skills/ipcalc-for-cloud/SKILL.md`

---

## Item 2: Clarify which output formats are actually implemented

**Status**: [x] Done
**Priority**: High

**Problem**: The SKILL.md implies all providers support all output formats. In reality many are planned but not implemented (Bicep, ARM, PowerShell, CloudFormation, gcloud, OCI, Aliyun CLI are marked "Planned" in `USAGE.md`). Claude will confidently attempt these and the script will return an error.

**Change**: Add a clear implementation status note to the workflow or output section. Mark unimplemented formats as "in progress" and instruct Claude to inform the user and suggest an alternative (e.g., use `info` or `json` instead).

**File**: `skills/ipcalc-for-cloud/SKILL.md`

---

## Item 3: Surface hub-spoke provider restriction early

**Status**: [x] Done
**Priority**: High

**Problem**: Hub-spoke topology is only supported for Azure and GCP. This is enforced in the script but only mentioned in passing in the SKILL.md. Claude may attempt hub-spoke for AWS, Oracle, or AliCloud and produce a confusing error.

**Change**: Add a clear callout in the workflow (Step 1 or Step 2) that hub-spoke is Azure and GCP only. If the user requests hub-spoke for another provider, Claude should explain the limitation and suggest the closest alternative.

**File**: `skills/ipcalc-for-cloud/SKILL.md`

---

## Item 4: Document the script path assumption

**Status**: [x] Done
**Priority**: Medium

**Problem**: The workflow hardcodes `~/.claude/skills/ipcalc-for-cloud/scripts/ipcalc.py`. This only works if the skill is symlinked at `~/.claude/skills/`. If installed via plugin cache or another path, this silently fails.

**Change**: Add a note in the skill (near Step 2) explaining that the path assumes the skill is installed/symlinked at `~/.claude/skills/ipcalc-for-cloud/`. Optionally, show Claude how to detect or confirm the path before running.

**File**: `skills/ipcalc-for-cloud/SKILL.md`

---

## Item 5: Add AWS availability zone caveat

**Status**: [x] Not needed — already correct
**Priority**: Medium

**Problem**: AWS availability zones are hardcoded to `us-east-1a/b/c/d/e/f` in `cloud_provider_config.py`. Generated Terraform for any other region (e.g., `eu-west-1`) will contain wrong AZ names that will fail to deploy.

**Finding**: The IaC outputs already use dynamic AZ resolution — no hardcoded AZ names appear in the generated deployment code:
- Terraform: `data.aws_availability_zones.available` data source, resolved at `apply` time
- CloudFormation: `!Select [N, !GetAZs ""]`, resolved for the stack's region
- CLI: `aws ec2 describe-availability-zones --region "${REGION}"` at runtime

The hardcoded AZs in `cloud_provider_config.py` only affect `info`/`json` display labels, which are illustrative and do not affect deployment. No change needed.

**File**: `skills/ipcalc-for-cloud/SKILL.md`

---

## Item 6: Move scripts/templates reference to a separate file

**Status**: [x] Done
**Priority**: Low

**Problem**: The `<scripts_reference>` and `<templates_reference>` sections push the SKILL.md to 533 lines — over the 500-line target. This content is only relevant when Claude needs to understand the internals (e.g., for debugging or extending the script), not for everyday use.

**Change**: Extract these two sections into `skills/ipcalc-for-cloud/references/internals.md`. Add a short pointer in SKILL.md: "For script and template internals, read `references/internals.md`."

**Files**:
- `skills/ipcalc-for-cloud/SKILL.md` (remove sections, add pointer)
- `skills/ipcalc-for-cloud/references/internals.md` (new file)

---

## Item 7: Optimize trigger description

**Status**: [ ] To do
**Priority**: Low

**Problem**: The current description is accurate but may under-trigger — Claude tends to be conservative about invoking skills. The description should be slightly more "pushy" to ensure it fires when a user talks about cloud networking, subnets, CIDR blocks, or IaC generation for cloud networks, even without explicitly naming the skill.

**Change**: Run the description through the skill-creator description optimization loop (`scripts/run_loop.py`) after all other items are done. Alternatively, hand-tune the description to be more specific and trigger-forward.

**File**: `skills/ipcalc-for-cloud/SKILL.md` (frontmatter `description` field)

---

## Completion Checklist

- [x] Item 1 — Fix quick start (slash command → natural language)
- [x] Item 2 — Clarify implemented vs. planned output formats
- [x] Item 3 — Surface hub-spoke provider restriction early
- [x] Item 4 — Document script path assumption
- [x] Item 5 — Add AWS availability zone caveat (not needed — IaC already uses dynamic AZ resolution)
- [x] Item 6 — Move scripts/templates reference to `references/internals.md`
- [ ] Item 7 — Optimize trigger description
