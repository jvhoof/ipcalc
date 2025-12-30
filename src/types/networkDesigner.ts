export interface Route {
  id: string;
  name: string;
  addressPrefix: string;
  nextHopType: 'VirtualNetworkGateway' | 'VnetLocal' | 'Internet' | 'VirtualAppliance' | 'None';
  nextHopIpAddress?: string;
  isSystemRoute: boolean;
}

export interface RouteTable {
  id: string;
  name: string;
  routes: Route[];
  disableBgpRoutePropagation: boolean;
}

export interface AzureSubnet {
  id: string;
  name: string;
  addressPrefix: string;
  routeTableId?: string;
  networkSecurityGroupId?: string;
  serviceEndpoints?: string[];
  delegations?: string[];
  privateEndpointNetworkPolicies?: 'Enabled' | 'Disabled';
  privateLinkServiceNetworkPolicies?: 'Enabled' | 'Disabled';
}

export interface AzureVM {
  id: string;
  name: string;
  subnetId: string;
  privateIpAddress: string;
  publicIpAddress?: string;
  vmSize: string;
  osType: 'Windows' | 'Linux';
  availabilityZone?: string;
  networkSecurityGroupId?: string;
}

export interface AzureVirtualNetwork {
  id: string;
  name: string;
  addressSpace: string[];
  subnets: AzureSubnet[];
  dnsServers?: string[];
  enableDdosProtection: boolean;
  enableVmProtection: boolean;
  location: string;
  resourceGroup: string;
}

export interface NetworkDiagram {
  id: string;
  name: string;
  description?: string;
  virtualNetworks: AzureVirtualNetwork[];
  routeTables: RouteTable[];
  vms: AzureVM[];
  createdAt: Date;
  updatedAt: Date;
}
