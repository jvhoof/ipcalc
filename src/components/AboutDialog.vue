<template>
  <v-dialog v-model="dialog" max-width="480">
    <v-card>
      <v-card-title class="text-h5 pt-6 px-6">About IP Calculator</v-card-title>
      <v-card-text class="px-6 pb-2">
        <p class="mb-4">
          IP Calculator is an open-source tool for calculating IP ranges, CIDR blocks,
          and subnet allocations for cloud networks including Azure, AWS, GCP, Oracle Cloud,
          and Alibaba Cloud.
        </p>
        <p class="mb-4">
          It supports single VNet/VPC and hub-spoke topologies, and can generate
          infrastructure as code templates for Terraform, Bicep, ARM, CloudFormation, and more.
        </p>
        <v-btn
          href="https://github.com/jvhoof/ipcalc"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          prepend-icon="mdi-github"
          class="mt-2"
        >
          View on GitHub
        </v-btn>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const dialog = ref(false)

function open() {
  dialog.value = true
}

defineExpose({ open })
</script>
