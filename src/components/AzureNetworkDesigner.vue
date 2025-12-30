<template>
  <div class="designer-container">
    <NetworkCanvas />
  </div>
</template>

<script setup lang="ts">
import NetworkCanvas from './designer/NetworkCanvas.vue'
</script>

<style scoped>
.designer-container {
  width: 100%;
  height: calc(100vh - 120px);
  position: relative;
}
</style>
