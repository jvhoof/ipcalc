<template>
  <v-app :style="{ backgroundColor: currentBackgroundColor }">
    <v-main class="d-flex align-center" style="position: relative; z-index: 1; padding-bottom: 80px; transition: background-color 0.5s ease;">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <h1 class="text-h2 text-center font-weight-bold mb-8" style="font-family: 'Roboto', sans-serif; color: white;">
              IP CALCULATOR
            </h1>

            <OnPremisesCalculator v-if="activeTab === 'on-premises'" />
            <AzureCalculator v-if="activeTab === 'azure'" />
            <AwsCalculator v-if="activeTab === 'aws'" />
            <GcpCalculator v-if="activeTab === 'gcp'" />
            <OracleCalculator v-if="activeTab === 'oracle'" />
            <AlicloudCalculator v-if="activeTab === 'alicloud'" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-bottom-navigation v-model="activeTab" grow>
      <v-btn value="on-premises">
        <v-icon>mdi-server</v-icon>
        <span>On-Premises</span>
      </v-btn>

      <v-btn value="azure">
        <v-icon>mdi-microsoft</v-icon>
        <span>Azure</span>
      </v-btn>

      <v-btn value="aws">
        <v-icon>mdi-aws</v-icon>
        <span>AWS</span>
      </v-btn>

      <v-btn value="gcp">
        <v-icon>mdi-google-cloud</v-icon>
        <span>Google Cloud</span>
      </v-btn>

      <v-btn value="oracle">
        <v-icon>mdi-cloud</v-icon>
        <span>Oracle</span>
      </v-btn>

      <v-btn value="alicloud">
        <v-icon>mdi-cloud</v-icon>
        <span>Alibaba</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import OnPremisesCalculator from './components/OnPremisesCalculator.vue'
import AzureCalculator from './components/AzureCalculator.vue'
import AwsCalculator from './components/AwsCalculator.vue'
import GcpCalculator from './components/GcpCalculator.vue'
import OracleCalculator from './components/OracleCalculator.vue'
import AlicloudCalculator from './components/AlicloudCalculator.vue'

// Default active tab - change this to set the default cloud provider
const activeTab = ref<string>('on-premises')

// Background color mapping for each cloud provider
const backgroundColors: Record<string, string> = {
  'on-premises': '#005955',
  'azure': '#0078D4',
  'aws': '#FF9900',
  'gcp': '#4285F4',
  'oracle': '#C74634',
  'alicloud': '#FF6A00'
}

// Computed property for current background color
const currentBackgroundColor = computed(() => {
  return backgroundColors[activeTab.value] || '#005955'
})
</script>

<style scoped>
.v-main {
  transition: background-color 0.5s ease;
}
</style>
