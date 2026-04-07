<template>
  <v-overlay
    v-model="visible"
    class="about-screen"
    :style="{ backgroundColor: '#0078D4' }"
    persistent
    no-click-animation
  >
    <div class="about-content d-flex flex-column align-center justify-center text-center px-6">
      <h1 class="about-title font-weight-bold mb-8" style="font-family: Roboto, sans-serif; color: #FFFFFF;">
        IP CALCULATOR
      </h1>

      <p class="about-text mb-4" style="color: #FFFFFF; max-width: 480px;">
        IP Calculator is an open-source tool for calculating CIDR ranges for on-premises networks. 
        It extends into public cloud networking Azure, AWS, GCP, Oracle Cloud,
        and Alibaba Cloud.
      </p>

      <p class="about-text mb-8" style="color: #FFFFFF; max-width: 480px;">
        In public cloud, the tool helps with different basic network topologies such as single VNET/VPC 
        and hub-spoke topologies. It generates infrastructure as code templates or scripts. 
      </p>

      <div class="d-flex align-center gap-4 mb-8">
        <v-btn
          href="https://github.com/jvhoof/ipcalc"
          target="_blank"
          rel="noopener noreferrer"
          icon
          variant="text"
          size="large"
          style="color: #FFFFFF;"
        >
          <v-icon size="32">mdi-github</v-icon>
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
.about-screen :deep(.v-overlay__content) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-content {
  width: 100%;
  height: 100%;
}

.about-title {
  font-size: clamp(1.75rem, 8vw, 3.75rem);
  line-height: 1.2;
  word-break: keep-all;
  white-space: nowrap;
}

.about-text {
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.95;
}

@media (max-width: 360px) {
  .about-title {
    font-size: 1.5rem;
    letter-spacing: -0.5px;
  }
}

@media (min-width: 600px) {
  .about-title {
    font-size: 3rem;
  }
}

@media (min-width: 960px) {
  .about-title {
    font-size: 3.75rem;
  }
}
</style>
