<template>
  <v-overlay
    v-model="visible"
    class="skills-screen"
    :style="{ backgroundColor: '#6A1B9A' }"
    persistent
    no-click-animation
  >
    <div class="skills-content d-flex flex-column align-center justify-center text-center px-6">
      <h1 class="skills-title font-weight-bold mb-2" style="font-family: Roboto, sans-serif; color: #FFFFFF;">
        IP CALCULATOR
      </h1>

      <p class="skills-subtitle mb-6" style="color: rgba(255,255,255,0.75); font-family: Roboto, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; font-size: 0.85rem;">
        agentic skill
      </p>

      <p class="skills-text mb-4" style="color: #FFFFFF; max-width: 520px;">
        A Claude Code skill that brings AI-assisted IP calculation directly into your workflow.
        Describe your network requirements in natural language and get CIDR calculations,
        subnet allocations, and infrastructure as code — for Azure, AWS, GCP, Oracle Cloud,
        AliCloud, and on-premises networks.
      </p>

      <p class="skills-text mb-6" style="color: rgba(255,255,255,0.85); max-width: 520px;">
        Supports single VNet/VPC and hub-spoke topologies with automatic availability zone
        distribution. Outputs info tables, JSON, Terraform, Bicep, ARM, CloudFormation,
        PowerShell, and provider CLI scripts.
      </p>

      <p class="skills-label mb-3" style="color: rgba(255,255,255,0.6); font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase;">
        How to use — example prompts
      </p>

      <div class="skills-examples mb-8" style="max-width: 520px; width: 100%;">
        <p class="skills-example mb-2" style="color: rgba(255,255,255,0.9); font-style: italic; font-size: 0.9rem;">
          "Calculate 4 subnets for Azure, base CIDR 10.0.0.0/16"
        </p>
        <p class="skills-example mb-2" style="color: rgba(255,255,255,0.9); font-style: italic; font-size: 0.9rem;">
          "Give me Terraform for an AWS VPC at 10.0.0.0/16 with 3 subnets"
        </p>
        <p class="skills-example mb-2" style="color: rgba(255,255,255,0.9); font-style: italic; font-size: 0.9rem;">
          "Plan 4 subnets with /26 prefix for Azure 172.16.1.0/24"
        </p>
        <p class="skills-example" style="color: rgba(255,255,255,0.9); font-style: italic; font-size: 0.9rem;">
          "Azure hub-spoke: hub 10.0.0.0/16 (2 subnets), spokes at 10.1 and 10.2"
        </p>
      </div>

      <div class="d-flex align-center gap-4 mb-8">
        <v-btn
          href="https://github.com/jvhoof/ipcalc/tree/main/skills/ipcalc-for-cloud"
          target="_blank"
          rel="noopener noreferrer"
          icon
          variant="text"
          size="large"
          style="color: #FFFFFF;"
          title="Skill on GitHub"
        >
          <v-icon size="32">mdi-github</v-icon>
        </v-btn>
        <v-btn
          href="https://github.com/jvhoof/ipcalc/blob/main/skills/ipcalc-for-cloud/USAGE.md"
          target="_blank"
          rel="noopener noreferrer"
          icon
          variant="text"
          size="large"
          style="color: #FFFFFF;"
          title="Usage documentation"
        >
          <v-icon size="32">mdi-book-open-variant</v-icon>
        </v-btn>
        <v-btn
          href="https://github.com/jvhoof/ipcalc/blob/main/skills/ipcalc-for-cloud/SKILL.md"
          target="_blank"
          rel="noopener noreferrer"
          icon
          variant="text"
          size="large"
          style="color: #FFFFFF;"
          title="Skill definition"
        >
          <v-icon size="32">mdi-cog-outline</v-icon>
        </v-btn>
      </div>

      <v-btn
        variant="outlined"
        style="color: #FFFFFF; border-color: rgba(255,255,255,0.6);"
        @click="visible = false"
      >
        Close
      </v-btn>
    </div>
  </v-overlay>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)

function open() {
  visible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.skills-screen :deep(.v-overlay__content) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.skills-content {
  width: 100%;
  min-height: 100%;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.skills-title {
  font-size: clamp(1.75rem, 8vw, 3.75rem);
  line-height: 1.2;
  word-break: keep-all;
  white-space: nowrap;
}

.skills-text {
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.95;
}

@media (max-width: 360px) {
  .skills-title {
    font-size: 1.5rem;
    letter-spacing: -0.5px;
  }
}

@media (min-width: 600px) {
  .skills-title {
    font-size: 3rem;
  }
}

@media (min-width: 960px) {
  .skills-title {
    font-size: 3.75rem;
  }
}
</style>
