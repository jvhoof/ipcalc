<template>
  <v-app :style="{ backgroundColor: currentBackgroundColor }">
    <v-main class="d-flex align-center" style="position: relative; z-index: 1; padding-bottom: 80px; transition: background-color 0.5s ease;">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <h1 class="responsive-title text-center font-weight-bold mb-8" style="font-family: 'Roboto', sans-serif; color: white;">
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

    <!-- Bottom Navigation - Responsive -->
    <v-bottom-navigation v-model="activeTab" grow class="bottom-nav">
      <!-- Always visible items -->
      <v-btn value="on-premises" class="nav-btn">
        <v-icon>mdi-server</v-icon>
        <span class="d-none d-sm-inline">On-Premises</span>
      </v-btn>

      <v-btn value="azure" class="nav-btn">
        <v-icon>mdi-microsoft</v-icon>
        <span class="d-none d-sm-inline">Azure</span>
      </v-btn>

      <v-btn value="aws" class="nav-btn">
        <v-icon>mdi-aws</v-icon>
        <span class="d-none d-sm-inline">AWS</span>
      </v-btn>

      <v-btn value="gcp" class="nav-btn">
        <v-icon>mdi-google-cloud</v-icon>
        <span class="d-none d-sm-inline">Google Cloud</span>
      </v-btn>

      <!-- Show Oracle and AliCloud directly on larger screens -->
      <v-btn value="oracle" class="nav-btn d-none d-md-flex">
        <v-icon>mdi-cloud</v-icon>
        <span>Oracle</span>
      </v-btn>

      <v-btn value="alicloud" class="nav-btn d-none d-md-flex">
        <v-icon>mdi-cloud</v-icon>
        <span>Alibaba</span>
      </v-btn>

      <!-- Overflow menu for small screens only -->
      <v-menu location="top">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" class="nav-btn d-md-none">
            <v-icon>mdi-dots-horizontal</v-icon>
            <span class="d-none d-sm-inline">More</span>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="activeTab = 'oracle'" :class="{ 'v-list-item--active': activeTab === 'oracle' }">
            <template v-slot:prepend>
              <v-icon>mdi-cloud</v-icon>
            </template>
            <v-list-item-title>Oracle Cloud</v-list-item-title>
          </v-list-item>
          <v-list-item @click="activeTab = 'alicloud'" :class="{ 'v-list-item--active': activeTab === 'alicloud' }">
            <template v-slot:prepend>
              <v-icon>mdi-cloud</v-icon>
            </template>
            <v-list-item-title>Alibaba Cloud</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
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

/* Responsive title - scales properly on all screen sizes */
.responsive-title {
  font-size: clamp(1.75rem, 8vw, 3.75rem);
  line-height: 1.2;
  word-break: keep-all;
  white-space: nowrap;
  overflow: visible;
  padding: 0 0.5rem;
}

/* Ensure bottom navigation is fully visible */
.bottom-nav {
  z-index: 1000;
}

/* Ensure nav buttons are properly sized */
.nav-btn {
  min-width: 0;
  flex: 1 1 auto;
}

/* Better spacing on very small screens */
@media (max-width: 360px) {
  .responsive-title {
    font-size: 1.5rem;
    letter-spacing: -0.5px;
  }
}

/* Tablet and up */
@media (min-width: 600px) {
  .responsive-title {
    font-size: 3rem;
  }
}

/* Desktop */
@media (min-width: 960px) {
  .responsive-title {
    font-size: 3.75rem;
  }
}
</style>
