<template>
  <v-card :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
    <v-card-title class="text-h6">Route Table Configuration</v-card-title>
    <v-card-text>
      <v-alert density="compact" class="mb-4" :style="themeStyles.infoBox" border="start">
        <div class="text-caption">
          <strong>Azure Route Tables:</strong><br>
          • System routes are provided by default and cannot be modified<br>
          • User-defined routes override system routes for custom traffic control<br>
          • Next hop types: VirtualAppliance, VirtualNetworkGateway, Internet, None
        </div>
      </v-alert>

      <v-card variant="outlined" class="mb-4" :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }">
        <v-card-title class="text-subtitle-1" :style="themeStyles.vpcInfoHeader">
          <v-icon class="mr-2">mdi-routes</v-icon>
          System Routes (Read-Only)
        </v-card-title>
        <v-card-text :style="{ color: nestedPanelTextColor }">
          <v-table density="compact" :style="{ backgroundColor: 'transparent' }">
            <thead>
              <tr>
                <th class="text-left">Address Prefix</th>
                <th class="text-left">Next Hop Type</th>
                <th class="text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in systemRoutes" :key="route.addressPrefix">
                <td>{{ route.addressPrefix }}</td>
                <td>{{ route.nextHopType }}</td>
                <td class="text-caption">{{ route.description }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-card variant="outlined" :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }">
        <v-card-title class="text-subtitle-1 d-flex align-center justify-space-between" :style="themeStyles.vpcInfoHeader">
          <div>
            <v-icon class="mr-2">mdi-sign-direction</v-icon>
            User-Defined Routes
          </div>
          <v-btn
            size="small"
            prepend-icon="mdi-plus"
            variant="elevated"
            @click="addRoute"
            :style="themeStyles.button"
          >
            Add Route
          </v-btn>
        </v-card-title>
        <v-card-text :style="{ color: nestedPanelTextColor }">
          <v-alert v-if="userRoutes.length === 0" type="info" density="compact" class="mb-4">
            No user-defined routes configured. Click "Add Route" to create a custom route.
          </v-alert>

          <div v-for="(route, index) in userRoutes" :key="route.id" class="mb-4">
            <v-card variant="outlined">
              <v-card-text>
                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="route.addressPrefix"
                      label="Address Prefix"
                      placeholder="10.0.0.0/16 or 0.0.0.0/0"
                      variant="outlined"
                      density="comfortable"
                      hint="Enter CIDR notation"
                      persistent-hint
                      :error-messages="route.error"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="route.nextHopType"
                      label="Next Hop Type"
                      :items="nextHopTypes"
                      variant="outlined"
                      density="comfortable"
                      hint="Select routing destination type"
                      persistent-hint
                      @update:model-value="onNextHopTypeChange(route)"
                    ></v-select>
                  </v-col>

                  <v-col cols="12" md="10">
                    <v-text-field
                      v-model="route.nextHopIpAddress"
                      label="Next Hop IP Address"
                      placeholder="10.0.1.4"
                      variant="outlined"
                      density="comfortable"
                      :disabled="route.nextHopType !== 'VirtualAppliance'"
                      hint="Required only for VirtualAppliance next hop type"
                      persistent-hint
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="2" class="d-flex align-center">
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      @click="deleteRoute(index)"
                      size="small"
                    >
                      <v-icon>mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="bottom">Delete Route</v-tooltip>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </div>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { getThemeStyles, getMainPanelBackgroundColor, getMainPanelTextColor, getNestedPanelBackgroundColor, getNestedPanelTextColor } from '../../config/cloudThemes'

const isDarkMode = inject<Ref<boolean>>('isDarkMode', ref(false))

const themeStyles = computed(() => getThemeStyles('azure', isDarkMode.value))
const mainPanelBgColor = computed(() => getMainPanelBackgroundColor(isDarkMode.value))
const mainPanelTextColor = computed(() => getMainPanelTextColor(isDarkMode.value))
const nestedPanelBgColor = computed(() => getNestedPanelBackgroundColor(isDarkMode.value))
const nestedPanelTextColor = computed(() => getNestedPanelTextColor(isDarkMode.value))

interface SystemRoute {
  addressPrefix: string
  nextHopType: string
  description: string
}

interface UserRoute {
  id: number
  addressPrefix: string
  nextHopType: string
  nextHopIpAddress: string
  error?: string
}

const systemRoutes: SystemRoute[] = [
  {
    addressPrefix: 'VNet Address Space',
    nextHopType: 'VNetLocal',
    description: 'Traffic within the VNet'
  },
  {
    addressPrefix: '0.0.0.0/0',
    nextHopType: 'Internet',
    description: 'Default route to Internet'
  },
  {
    addressPrefix: '10.0.0.0/8',
    nextHopType: 'None',
    description: 'Private network range (RFC 1918)'
  },
  {
    addressPrefix: '172.16.0.0/12',
    nextHopType: 'None',
    description: 'Private network range (RFC 1918)'
  },
  {
    addressPrefix: '192.168.0.0/16',
    nextHopType: 'None',
    description: 'Private network range (RFC 1918)'
  },
  {
    addressPrefix: '100.64.0.0/10',
    nextHopType: 'None',
    description: 'Shared address space (RFC 6598)'
  }
]

const nextHopTypes = [
  { title: 'Virtual Appliance', value: 'VirtualAppliance' },
  { title: 'Virtual Network Gateway', value: 'VirtualNetworkGateway' },
  { title: 'Internet', value: 'Internet' },
  { title: 'None', value: 'None' }
]

const userRoutes = ref<UserRoute[]>([])
let nextRouteId = 1

const addRoute = (): void => {
  userRoutes.value.push({
    id: nextRouteId++,
    addressPrefix: '',
    nextHopType: 'VirtualAppliance',
    nextHopIpAddress: ''
  })
}

const deleteRoute = (index: number): void => {
  userRoutes.value.splice(index, 1)
}

const onNextHopTypeChange = (route: UserRoute): void => {
  if (route.nextHopType !== 'VirtualAppliance') {
    route.nextHopIpAddress = ''
  }
  route.error = undefined
}
</script>

<style scoped>
.v-table :deep(thead th) {
  font-weight: 600;
}

.v-table :deep(tbody td) {
  font-size: 0.875rem;
}
</style>
