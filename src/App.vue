<template>
  <v-app :style="{ backgroundColor: currentBackgroundColor }">
    <v-main class="d-flex align-center" style="position: relative; z-index: 1; padding-bottom: 80px; transition: background-color 0.5s ease;">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <h1 class="responsive-title text-center font-weight-bold mb-8" :style="{ fontFamily: 'Roboto, sans-serif', color: currentTitleColor, transition: 'color 0.5s ease' }">
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
    <v-bottom-navigation
      v-model="activeTab"
      grow
      class="bottom-nav"
      :style="{ backgroundColor: navBarBackgroundColor, transition: 'background-color 0.3s ease' }"
    >
      <!-- Always visible items -->
      <v-btn value="on-premises" class="nav-btn" :style="{ color: navBarTextColor }">
        <v-icon :style="{ color: navBarTextColor }">mdi-server</v-icon>
        <span class="d-none d-sm-inline">On-Premises</span>
      </v-btn>

      <v-btn value="azure" class="nav-btn" :style="{ color: navBarTextColor }">
        <v-icon :style="{ color: navBarTextColor }">mdi-microsoft</v-icon>
        <span class="d-none d-sm-inline">Azure</span>
      </v-btn>

      <v-btn value="aws" class="nav-btn" :style="{ color: navBarTextColor }">
        <v-icon :style="{ color: navBarTextColor }">mdi-aws</v-icon>
        <span class="d-none d-sm-inline">AWS</span>
      </v-btn>

      <v-btn value="gcp" class="nav-btn" :style="{ color: navBarTextColor }">
        <v-icon :style="{ color: navBarTextColor }">mdi-google-cloud</v-icon>
        <span class="d-none d-sm-inline">Google Cloud</span>
      </v-btn>

      <!-- Show Oracle and AliCloud directly on larger screens -->
      <v-btn value="oracle" class="nav-btn d-none d-md-flex" :style="{ color: navBarTextColor }">
        <v-icon :style="{ color: navBarTextColor }">mdi-cloud</v-icon>
        <span>Oracle</span>
      </v-btn>

      <v-btn value="alicloud" class="nav-btn d-none d-md-flex" :style="{ color: navBarTextColor }">
        <v-icon :style="{ color: navBarTextColor }">mdi-cloud</v-icon>
        <span>Alibaba</span>
      </v-btn>

      <!-- Overflow menu for small screens only -->
      <v-menu location="top">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" class="nav-btn d-md-none" :style="{ color: navBarTextColor }">
            <v-icon :style="{ color: navBarTextColor }">mdi-dots-horizontal</v-icon>
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

      <!-- Dark mode toggle menu (always visible) -->
      <v-menu location="top">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" class="nav-btn" :style="{ color: navBarTextColor }">
            <v-icon :style="{ color: navBarTextColor }">mdi-dots-vertical</v-icon>
            <span class="d-none d-sm-inline">Settings</span>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="toggleDarkMode">
            <template v-slot:prepend>
              <v-icon>{{ isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </template>
            <v-list-item-title>{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-bottom-navigation>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import OnPremisesCalculator from './components/OnPremisesCalculator.vue'
import AzureCalculator from './components/AzureCalculator.vue'
import AwsCalculator from './components/AwsCalculator.vue'
import GcpCalculator from './components/GcpCalculator.vue'
import OracleCalculator from './components/OracleCalculator.vue'
import AlicloudCalculator from './components/AlicloudCalculator.vue'
import {
  getBackgroundColor,
  getTitleColor,
  getNavBarBackgroundColor,
  getNavBarTextColor
} from './config/cloudThemes'

// Default active tab - change this to set the default cloud provider
const activeTab = ref<string>('on-premises')

// Dark mode state - will be set based on system preference
const isDarkMode = ref<boolean>(false)

// Detect system theme preference
const detectSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDarkMode.value = true
  } else {
    isDarkMode.value = false
  }
}

// Handle system theme changes
const handleThemeChange = (e: MediaQueryListEvent) => {
  isDarkMode.value = e.matches
}

// Initialize theme detection on mount
onMounted(() => {
  detectSystemTheme()

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleThemeChange)
})

// Clean up event listener on unmount
onUnmounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.removeEventListener('change', handleThemeChange)
})

// Provide dark mode state to all child components
provide('isDarkMode', isDarkMode)

// Toggle dark mode function
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
}

// Computed property for current background color
const currentBackgroundColor = computed(() => {
  return getBackgroundColor(activeTab.value, isDarkMode.value)
})

// Computed property for title color
const currentTitleColor = computed(() => {
  return getTitleColor(activeTab.value, isDarkMode.value)
})

// Computed properties for bottom navigation bar colors
const navBarBackgroundColor = computed(() => {
  return getNavBarBackgroundColor(isDarkMode.value)
})

const navBarTextColor = computed(() => {
  return getNavBarTextColor(isDarkMode.value)
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
  transition: color 0.3s ease;
}

/* Style nav button icons with smooth transitions */
.nav-btn :deep(.v-icon) {
  transition: color 0.3s ease;
}

/* Style nav button text with smooth transitions */
.nav-btn :deep(span) {
  transition: color 0.3s ease;
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
