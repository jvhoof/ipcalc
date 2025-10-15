/**
 * Cloud Provider Theme Configuration
 *
 * This file contains color schemes for different cloud providers
 * to ensure consistent branding throughout the application.
 */

export interface CloudTheme {
  name: string
  colors: {
    primary: string           // Main brand color
    buttonBackground: string  // Action button background
    buttonText: string        // Action button text color
    vpcInfoHeader: string     // VPC/VNet/VCN Information card header
    vpcInfoHeaderText: string // VPC/VNet/VCN Information card header text
    subnetChip: string        // Subnet/vSwitch chip background
    subnetChipText: string    // Subnet/vSwitch chip text
    usableIpsText: string     // Usable IPs text color in subnet details
    dialogHeader: string      // Code dialog header background
    dialogHeaderText: string  // Code dialog header text
    infoBoxBackground: string // Requirements info box background
    infoBoxBorder: string     // Requirements info box border
  }
}

export const cloudThemes: Record<string, CloudTheme> = {
  azure: {
    name: 'Microsoft Azure',
    colors: {
      primary: '#104581',
      buttonBackground: '#104581',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#104581',
      vpcInfoHeaderText: '#FFFFFF',
      subnetChip: '#0078D4',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#0078D4',
      dialogHeader: '#104581',
      dialogHeaderText: '#FFFFFF',
      infoBoxBackground: '#E6F2FF',
      infoBoxBorder: '#0078D4',
    },
  },
  gcp: {
    name: 'Google Cloud Platform',
    colors: {
      primary: '#4285F4',
      buttonBackground: '#4285F4',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#4285F4',
      vpcInfoHeaderText: '#FFFFFF',
      subnetChip: '#4285F4',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#4285F4',
      dialogHeader: '#4285F4',
      dialogHeaderText: '#FFFFFF',
      infoBoxBackground: '#E8F0FE',
      infoBoxBorder: '#4285F4',
    },
  },
  oracle: {
    name: 'Oracle Cloud Infrastructure',
    colors: {
      primary: '#C74634',
      buttonBackground: '#C74634',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#C74634',
      vpcInfoHeaderText: '#FFFFFF',
      subnetChip: '#C74634',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#C74634',
      dialogHeader: '#C74634',
      dialogHeaderText: '#FFFFFF',
      infoBoxBackground: '#FDE8E5',
      infoBoxBorder: '#C74634',
    },
  },
  alicloud: {
    name: 'Alibaba Cloud',
    colors: {
      primary: '#FF6A00',
      buttonBackground: '#FF6A00',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#FF6A00',
      vpcInfoHeaderText: '#FFFFFF',
      subnetChip: '#FF6A00',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#FF6A00',
      dialogHeader: '#FF6A00',
      dialogHeaderText: '#FFFFFF',
      infoBoxBackground: '#FFF4E6',
      infoBoxBorder: '#FF6A00',
    },
  },
  aws: {
    name: 'Amazon Web Services',
    colors: {
      primary: '#FF9900',
      buttonBackground: '#FF9900',
      buttonText: '#232F3E',
      vpcInfoHeader: '#232F3E',
      vpcInfoHeaderText: '#FFFFFF',
      subnetChip: '#FF9900',
      subnetChipText: '#232F3E',
      usableIpsText: '#FF9900',
      dialogHeader: '#232F3E',
      dialogHeaderText: '#FFFFFF',
      infoBoxBackground: '#FFF6E6',
      infoBoxBorder: '#FF9900',
    },
  },
}

/**
 * Get theme configuration for a specific cloud provider
 * @param provider - The cloud provider key (azure, gcp, oracle, alicloud, aws)
 * @returns CloudTheme configuration
 */
export function getCloudTheme(provider: string): CloudTheme {
  return cloudThemes[provider] || cloudThemes.azure
}

/**
 * Helper function to generate inline styles for component elements
 */
export function getThemeStyles(provider: string) {
  const theme = getCloudTheme(provider)

  return {
    vpcInfoHeader: {
      backgroundColor: theme.colors.vpcInfoHeader,
      color: theme.colors.vpcInfoHeaderText,
    },
    button: {
      backgroundColor: theme.colors.buttonBackground,
      color: theme.colors.buttonText,
    },
    subnetChip: {
      backgroundColor: theme.colors.subnetChip,
      color: theme.colors.subnetChipText,
    },
    usableIps: {
      color: theme.colors.usableIpsText,
    },
    dialogHeader: {
      backgroundColor: theme.colors.dialogHeader,
      color: theme.colors.dialogHeaderText,
    },
    infoBox: {
      backgroundColor: theme.colors.infoBoxBackground,
      borderColor: theme.colors.infoBoxBorder,
    },
  }
}
