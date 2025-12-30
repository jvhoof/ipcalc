<template>
  <v-navigation-drawer
    :model-value="modelValue"
    location="right"
    :width="400"
    :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-toolbar
      density="compact"
      :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }"
    >
      <v-toolbar-title class="text-h6">Properties</v-toolbar-title>
      <v-btn
        icon="mdi-close"
        variant="text"
        @click="$emit('update:modelValue', false)"
      ></v-btn>
    </v-toolbar>

    <v-divider></v-divider>

    <div v-if="!selectedNode" class="pa-4 text-center text-medium-emphasis">
      <v-icon size="64" class="mb-4">mdi-information-outline</v-icon>
      <p>Select a node to view and edit its properties</p>
    </div>

    <v-container v-if="selectedNode" class="pa-4" fluid>
      <v-card
        variant="flat"
        :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }"
      >
        <v-card-subtitle class="text-overline">
          {{ nodeTypeLabel }}
        </v-card-subtitle>
        <v-card-title class="text-h6 pb-2">
          {{ selectedNode.name || selectedNode.id }}
        </v-card-title>
      </v-card>

      <v-divider class="my-4"></v-divider>

      <div v-if="isVNetNode">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">Virtual Network</h3>
        
        <v-text-field
          v-model="vnetName"
          label="VNet Name"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVNetName"
        ></v-text-field>

        <v-combobox
          v-model="vnetAddressSpace"
          label="Address Space (CIDR)"
          variant="outlined"
          density="comfortable"
          multiple
          chips
          closable-chips
          class="mb-3"
          hint="Press Enter to add multiple CIDR blocks"
          persistent-hint
          @update:model-value="updateVNetAddressSpace"
        ></v-combobox>

        <v-text-field
          v-model="vnetLocation"
          label="Location"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVNetLocation"
        ></v-text-field>

        <v-text-field
          v-model="vnetResourceGroup"
          label="Resource Group"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVNetResourceGroup"
        ></v-text-field>

        <v-checkbox
          v-model="enableDdosProtection"
          label="Enable DDoS Protection"
          density="compact"
          @update:model-value="updateVNetDdosProtection"
        ></v-checkbox>

        <v-checkbox
          v-model="enableVmProtection"
          label="Enable VM Protection"
          density="compact"
          @update:model-value="updateVNetVmProtection"
        ></v-checkbox>
      </div>

      <div v-if="isSubnetNode">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">Subnet</h3>
        
        <v-text-field
          v-model="subnetName"
          label="Subnet Name"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateSubnetName"
        ></v-text-field>

        <v-text-field
          v-model="subnetAddressPrefix"
          label="Address Prefix (CIDR)"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          placeholder="10.0.1.0/24"
          @update:model-value="updateSubnetAddressPrefix"
        ></v-text-field>

        <v-divider class="my-4"></v-divider>

        <h3 class="text-subtitle-1 font-weight-bold mb-3">Route Table</h3>
        
        <v-select
          v-model="selectedRouteTableId"
          label="Select Route Table"
          :items="availableRouteTables"
          item-title="name"
          item-value="id"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
          @update:model-value="updateSubnetRouteTable"
        >
          <template v-slot:prepend-item>
            <v-list-item @click="createNewRouteTable">
              <template v-slot:prepend>
                <v-icon>mdi-plus</v-icon>
              </template>
              <v-list-item-title>Create New Route Table</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
          </template>
        </v-select>

        <RouteTableEditor
          v-if="selectedRouteTable"
          :route-table="selectedRouteTable"
          @update:route-table="handleRouteTableUpdate"
          @update:route="handleRouteUpdate"
          @add:route="handleAddRoute"
          @delete:route="handleDeleteRoute"
        />
      </div>

      <div v-if="isVMNode">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">Virtual Machine</h3>
        
        <v-text-field
          v-model="vmName"
          label="VM Name"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVMName"
        ></v-text-field>

        <v-autocomplete
          v-model="vmSize"
          label="VM Size"
          :items="vmSizes"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVMSize"
        ></v-autocomplete>

        <v-select
          v-model="vmOsType"
          label="OS Type"
          :items="osTypes"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVMOsType"
        ></v-select>

        <v-text-field
          v-model="vmPrivateIp"
          label="Private IP Address"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="updateVMPrivateIp"
        ></v-text-field>

        <v-text-field
          v-model="vmPublicIp"
          label="Public IP Address"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          hint="Optional"
          persistent-hint
          @update:model-value="updateVMPublicIp"
        ></v-text-field>

        <v-select
          v-model="vmAvailabilityZone"
          label="Availability Zone"
          :items="availabilityZones"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
          @update:model-value="updateVMAvailabilityZone"
        ></v-select>
      </div>
    </v-container>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import type {
  AzureVirtualNetwork,
  AzureSubnet,
  AzureVM,
  RouteTable,
  Route
} from '../../types/networkDesigner'
import RouteTableEditor from './RouteTableEditor.vue'
import {
  getMainPanelBackgroundColor,
  getMainPanelTextColor,
  getNestedPanelBackgroundColor,
  getNestedPanelTextColor
} from '../../config/cloudThemes'

type NetworkNode = AzureVirtualNetwork | AzureSubnet | AzureVM

const props = defineProps<{
  modelValue: boolean
  selectedNode: NetworkNode | null
  routeTables: RouteTable[]
  vnetId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:vnet': [vnetId: string, updates: Partial<Omit<AzureVirtualNetwork, 'id' | 'subnets'>>]
  'update:subnet': [vnetId: string, subnetId: string, updates: Partial<Omit<AzureSubnet, 'id'>>]
  'update:vm': [vmId: string, updates: Partial<Omit<AzureVM, 'id'>>]
  'create:routeTable': [name: string]
  'update:routeTable': [routeTableId: string, updates: Partial<Omit<RouteTable, 'id' | 'routes'>>]
  'update:route': [routeTableId: string, routeId: string, updates: Partial<Omit<Route, 'id'>>]
  'add:route': [routeTableId: string, route: Omit<Route, 'id'>]
  'delete:route': [routeTableId: string, routeId: string]
  'associate:routeTable': [vnetId: string, subnetId: string, routeTableId: string]
  'dissociate:routeTable': [vnetId: string, subnetId: string]
}>()

const isDarkMode = inject<{ value: boolean }>('isDarkMode', { value: false })

const mainPanelBgColor = computed(() => getMainPanelBackgroundColor(isDarkMode.value))
const mainPanelTextColor = computed(() => getMainPanelTextColor(isDarkMode.value))
const nestedPanelBgColor = computed(() => getNestedPanelBackgroundColor(isDarkMode.value))
const nestedPanelTextColor = computed(() => getNestedPanelTextColor(isDarkMode.value))

const isVNetNode = computed(() => {
  if (!props.selectedNode) return false
  return 'addressSpace' in props.selectedNode && 'subnets' in props.selectedNode
})

const isSubnetNode = computed(() => {
  if (!props.selectedNode) return false
  return 'addressPrefix' in props.selectedNode && !('privateIpAddress' in props.selectedNode)
})

const isVMNode = computed(() => {
  if (!props.selectedNode) return false
  return 'vmSize' in props.selectedNode && 'privateIpAddress' in props.selectedNode
})

const nodeTypeLabel = computed(() => {
  if (isVNetNode.value) return 'Virtual Network'
  if (isSubnetNode.value) return 'Subnet'
  if (isVMNode.value) return 'Virtual Machine'
  return 'Unknown'
})

const vnetName = ref('')
const vnetAddressSpace = ref<string[]>([])
const vnetLocation = ref('')
const vnetResourceGroup = ref('')
const enableDdosProtection = ref(false)
const enableVmProtection = ref(false)

const subnetName = ref('')
const subnetAddressPrefix = ref('')
const selectedRouteTableId = ref<string | null>(null)

const vmName = ref('')
const vmSize = ref('Standard_B2s')
const vmOsType = ref<'Windows' | 'Linux'>('Linux')
const vmPrivateIp = ref('')
const vmPublicIp = ref('')
const vmAvailabilityZone = ref<string | undefined>(undefined)

const vmSizes = [
  'Standard_B1s', 'Standard_B1ms', 'Standard_B2s', 'Standard_B2ms', 'Standard_B4ms',
  'Standard_D2s_v3', 'Standard_D4s_v3', 'Standard_D8s_v3', 'Standard_D16s_v3',
  'Standard_E2s_v3', 'Standard_E4s_v3', 'Standard_E8s_v3', 'Standard_E16s_v3',
  'Standard_F2s_v2', 'Standard_F4s_v2', 'Standard_F8s_v2', 'Standard_F16s_v2'
]

const osTypes = [
  { title: 'Linux', value: 'Linux' },
  { title: 'Windows', value: 'Windows' }
]

const availabilityZones = ['1', '2', '3']

const availableRouteTables = computed(() => {
  return props.routeTables.map(rt => ({
    id: rt.id,
    name: rt.name
  }))
})

const selectedRouteTable = computed(() => {
  if (!selectedRouteTableId.value) return null
  return props.routeTables.find(rt => rt.id === selectedRouteTableId.value) || null
})

watch(() => props.selectedNode, (newNode) => {
  if (!newNode) return

  if (isVNetNode.value) {
    const vnet = newNode as AzureVirtualNetwork
    vnetName.value = vnet.name
    vnetAddressSpace.value = [...vnet.addressSpace]
    vnetLocation.value = vnet.location
    vnetResourceGroup.value = vnet.resourceGroup
    enableDdosProtection.value = vnet.enableDdosProtection
    enableVmProtection.value = vnet.enableVmProtection
  } else if (isSubnetNode.value) {
    const subnet = newNode as AzureSubnet
    subnetName.value = subnet.name
    subnetAddressPrefix.value = subnet.addressPrefix
    selectedRouteTableId.value = subnet.routeTableId || null
  } else if (isVMNode.value) {
    const vm = newNode as AzureVM
    vmName.value = vm.name
    vmSize.value = vm.vmSize
    vmOsType.value = vm.osType
    vmPrivateIp.value = vm.privateIpAddress
    vmPublicIp.value = vm.publicIpAddress || ''
    vmAvailabilityZone.value = vm.availabilityZone
  }
}, { immediate: true, deep: true })

const updateVNetName = () => {
  if (props.selectedNode && isVNetNode.value) {
    emit('update:vnet', props.selectedNode.id, { name: vnetName.value })
  }
}

const updateVNetAddressSpace = () => {
  if (props.selectedNode && isVNetNode.value) {
    emit('update:vnet', props.selectedNode.id, { addressSpace: vnetAddressSpace.value })
  }
}

const updateVNetLocation = () => {
  if (props.selectedNode && isVNetNode.value) {
    emit('update:vnet', props.selectedNode.id, { location: vnetLocation.value })
  }
}

const updateVNetResourceGroup = () => {
  if (props.selectedNode && isVNetNode.value) {
    emit('update:vnet', props.selectedNode.id, { resourceGroup: vnetResourceGroup.value })
  }
}

const updateVNetDdosProtection = () => {
  if (props.selectedNode && isVNetNode.value) {
    emit('update:vnet', props.selectedNode.id, { enableDdosProtection: enableDdosProtection.value })
  }
}

const updateVNetVmProtection = () => {
  if (props.selectedNode && isVNetNode.value) {
    emit('update:vnet', props.selectedNode.id, { enableVmProtection: enableVmProtection.value })
  }
}

const updateSubnetName = () => {
  if (props.selectedNode && isSubnetNode.value && props.vnetId) {
    emit('update:subnet', props.vnetId, props.selectedNode.id, { name: subnetName.value })
  }
}

const updateSubnetAddressPrefix = () => {
  if (props.selectedNode && isSubnetNode.value && props.vnetId) {
    emit('update:subnet', props.vnetId, props.selectedNode.id, { addressPrefix: subnetAddressPrefix.value })
  }
}

const updateSubnetRouteTable = () => {
  if (props.selectedNode && isSubnetNode.value && props.vnetId) {
    if (selectedRouteTableId.value) {
      emit('associate:routeTable', props.vnetId, props.selectedNode.id, selectedRouteTableId.value)
    } else {
      emit('dissociate:routeTable', props.vnetId, props.selectedNode.id)
    }
  }
}

const createNewRouteTable = () => {
  const name = `RouteTable-${Date.now()}`
  emit('create:routeTable', name)
}

const handleRouteTableUpdate = (routeTable: RouteTable) => {
  emit('update:routeTable', routeTable.id, {
    name: routeTable.name,
    disableBgpRoutePropagation: routeTable.disableBgpRoutePropagation
  })
}

const handleRouteUpdate = (routeId: string, updates: Partial<Omit<Route, 'id'>>) => {
  if (selectedRouteTableId.value) {
    emit('update:route', selectedRouteTableId.value, routeId, updates)
  }
}

const handleAddRoute = (route: Omit<Route, 'id'>) => {
  if (selectedRouteTableId.value) {
    emit('add:route', selectedRouteTableId.value, route)
  }
}

const handleDeleteRoute = (routeId: string) => {
  if (selectedRouteTableId.value) {
    emit('delete:route', selectedRouteTableId.value, routeId)
  }
}

const updateVMName = () => {
  if (props.selectedNode && isVMNode.value) {
    emit('update:vm', props.selectedNode.id, { name: vmName.value })
  }
}

const updateVMSize = () => {
  if (props.selectedNode && isVMNode.value) {
    emit('update:vm', props.selectedNode.id, { vmSize: vmSize.value })
  }
}

const updateVMOsType = () => {
  if (props.selectedNode && isVMNode.value) {
    emit('update:vm', props.selectedNode.id, { osType: vmOsType.value })
  }
}

const updateVMPrivateIp = () => {
  if (props.selectedNode && isVMNode.value) {
    emit('update:vm', props.selectedNode.id, { privateIpAddress: vmPrivateIp.value })
  }
}

const updateVMPublicIp = () => {
  if (props.selectedNode && isVMNode.value) {
    emit('update:vm', props.selectedNode.id, { publicIpAddress: vmPublicIp.value || undefined })
  }
}

const updateVMAvailabilityZone = () => {
  if (props.selectedNode && isVMNode.value) {
    emit('update:vm', props.selectedNode.id, { availabilityZone: vmAvailabilityZone.value })
  }
}
</script>

<style scoped>
.v-navigation-drawer {
  overflow-y: auto;
}
</style>
