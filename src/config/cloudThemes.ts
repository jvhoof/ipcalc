/**
 * Cloud Provider Theme Configuration
 *
 * This file contains color schemes for different cloud providers
 * to ensure consistent branding throughout the application.
 * Supports both light and dark mode themes.
 */

/**
 * Combined theme color configuration for a specific mode (light or dark)
 */
export interface ThemeColors {
  // Component-level colors
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

  // App-level colors
  backgroundColor: string       // Main app background color
  titleColor: string           // Title text color
  navBarBackground?: string    // Navigation bar background (undefined = Vuetify default)
  navBarText?: string          // Navigation bar text color (undefined = Vuetify default)
  mainPanelBackground?: string // Main panel/card background color (undefined = Vuetify default)
  mainPanelText?: string       // Main panel/card text color (undefined = Vuetify default)
  nestedPanelBackground?: string // Nested panel/card background (VPC/VNet info, Binary, etc.) (undefined = Vuetify default)
  nestedPanelText?: string     // Nested panel/card text color (undefined = Vuetify default)
}

/**
 * Cloud provider theme configuration
 */
export interface CloudTheme {
  name: string
  light: ThemeColors
  dark: ThemeColors
}

export const cloudThemes: Record<string, CloudTheme> = {
  azure: {
    name: 'Microsoft Azure',
    light: {
      // Component-level colors
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
      // App-level colors
      backgroundColor: '#0078D4',
      titleColor: '#FFFFFF',
    },
    dark: {
      // Component-level colors
      primary: '#3B9FF5',
      buttonBackground: '#2B6DAE',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#2B6DAE',
      vpcInfoHeaderText: '#E0E0E0',
      subnetChip: '#2B6DAE',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#3B9FF5',
      dialogHeader: '#1A4F7A',
      dialogHeaderText: '#E0E0E0',
      infoBoxBackground: '#1E2A3A',
      infoBoxBorder: '#2B6DAE',
      // App-level colors
      backgroundColor: '#003055',
      titleColor: '#F5F5F5',
      navBarBackground: '#212121',
      navBarText: '#F5F5F5',
      mainPanelBackground: '#424242',
      mainPanelText: '#F5F5F5',
      nestedPanelBackground: '#424242',
      nestedPanelText: '#F5F5F5',
    },
  },
  gcp: {
    name: 'Google Cloud Platform',
    light: {
      // Component-level colors
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
      // App-level colors
      backgroundColor: '#4285F4',
      titleColor: '#FFFFFF',
    },
    dark: {
      // Component-level colors
      primary: '#669DF6',
      buttonBackground: '#3367D6',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#1A73E8',
      vpcInfoHeaderText: '#E0E0E0',
      subnetChip: '#3367D6',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#669DF6',
      dialogHeader: '#1A73E8',
      dialogHeaderText: '#E0E0E0',
      infoBoxBackground: '#1E2A3A',
      infoBoxBorder: '#3367D6',
      // App-level colors
      backgroundColor: '#073075',
      titleColor: '#F5F5F5',
      navBarBackground: '#212121',
      navBarText: '#F5F5F5',
      mainPanelBackground: '#424242',
      mainPanelText: '#F5F5F5',
      nestedPanelBackground: '#424242',
      nestedPanelText: '#F5F5F5',
    },
  },
  oracle: {
    name: 'Oracle Cloud Infrastructure',
    light: {
      // Component-level colors
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
      // App-level colors
      backgroundColor: '#C74634',
      titleColor: '#FFFFFF',
    },
    dark: {
      // Component-level colors
      primary: '#E86B56',
      buttonBackground: '#501c15',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#8B2F1F',
      vpcInfoHeaderText: '#E0E0E0',
      subnetChip: '#A83B2A',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#E86B56',
      dialogHeader: '#8B2F1F',
      dialogHeaderText: '#E0E0E0',
      infoBoxBackground: '#2A1E1C',
      infoBoxBorder: '#A83B2A',
      // App-level colors
      backgroundColor: '#501c15',
      titleColor: '#F5F5F5',
      navBarBackground: '#212121',
      navBarText: '#F5F5F5',
      mainPanelBackground: '#424242',
      mainPanelText: '#F5F5F5',
      nestedPanelBackground: '#424242',
      nestedPanelText: '#F5F5F5',
    },
  },
  alicloud: {
    name: 'Alibaba Cloud',
    light: {
      // Component-level colors
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
      // App-level colors
      backgroundColor: '#FF6A00',
      titleColor: '#FFFFFF',
    },
    dark: {
      // Component-level colors
      primary: '#FF8C33',
      buttonBackground: '#994000',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#994000',
      vpcInfoHeaderText: '#E0E0E0',
      subnetChip: '#CC5500',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#FF8C33',
      dialogHeader: '#994000',
      dialogHeaderText: '#E0E0E0',
      infoBoxBackground: '#2A2118',
      infoBoxBorder: '#CC5500',
      // App-level colors
      backgroundColor: '#662900',
      titleColor: '#F5F5F5',
      navBarBackground: '#212121',
      navBarText: '#F5F5F5',
      mainPanelBackground: '#424242',
      mainPanelText: '#F5F5F5',
      nestedPanelBackground: '#424242',
      nestedPanelText: '#F5F5F5',
    },
  },
  aws: {
    name: 'Amazon Web Services',
    light: {
      // Component-level colors
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
      // App-level colors
      backgroundColor: '#FF9900',
      titleColor: '#FFFFFF',
    },
    dark: {
      // Component-level colors
      primary: '#FFB84D',
      buttonBackground: '#995c00',
      buttonText: '#F5F5F5',
      vpcInfoHeader: '#995c00',
      vpcInfoHeaderText: '#F5F5F5',
      subnetChip: '#995c00',
      subnetChipText: '#F5F5F5',
      usableIpsText: '#F5F5F5',
      dialogHeader: '#1A2633',
      dialogHeaderText: '#E0E0E0',
      infoBoxBackground: '#F5F5F5',
      infoBoxBorder: '#E88A00',
      // App-level colors
      backgroundColor: '#663d00',
      titleColor: '#F5F5F5',
      navBarBackground: '#212121',
      navBarText: '#F5F5F5',
      mainPanelBackground: '#424242',
      mainPanelText: '#F5F5F5',
      nestedPanelBackground: '#424242',
      nestedPanelText: '#F5F5F5',
    },
  },
  'on-premises': {
    name: 'On-Premises',
    light: {
      // Component-level colors
      primary: '#005955',
      buttonBackground: '#005955',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#005955',
      vpcInfoHeaderText: '#FFFFFF',
      subnetChip: '#00A99D',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#00A99D',
      dialogHeader: '#005955',
      dialogHeaderText: '#FFFFFF',
      infoBoxBackground: '#E6F9F8',
      infoBoxBorder: '#00A99D',
      // App-level colors
      backgroundColor: '#005955',
      titleColor: '#FFFFFF',
    },
    dark: {
      // Component-level colors
      primary: '#00A99D',
      buttonBackground: '#007A72',
      buttonText: '#FFFFFF',
      vpcInfoHeader: '#004F4C',
      vpcInfoHeaderText: '#E0E0E0',
      subnetChip: '#007A72',
      subnetChipText: '#FFFFFF',
      usableIpsText: '#00A99D',
      dialogHeader: '#004F4C',
      dialogHeaderText: '#E0E0E0',
      infoBoxBackground: '#1E2A29',
      infoBoxBorder: '#007A72',
      // App-level colors
      backgroundColor: '#002422',
      titleColor: '#F5F5F5',
      navBarBackground: '#212121',
      navBarText: '#F5F5F5',
      mainPanelBackground: '#424242',
      mainPanelText: '#F5F5F5',
      nestedPanelBackground: '#424242',
      nestedPanelText: '#F5F5F5',
    },
  },
}

/**
 * Get theme configuration for a specific cloud provider
 * @param provider - The cloud provider key (azure, gcp, oracle, alicloud, aws, on-premises)
 * @returns CloudTheme configuration
 */
export function getCloudTheme(provider: string): CloudTheme {
  return cloudThemes[provider] || cloudThemes.azure
}

/**
 * Helper function to generate inline styles for component elements
 * @param provider - The cloud provider key (azure, gcp, oracle, alicloud, aws, on-premises)
 * @param isDarkMode - Whether dark mode is enabled
 */
export function getThemeStyles(provider: string, isDarkMode: boolean = false) {
  const theme = getCloudTheme(provider)
  const colors = isDarkMode ? theme.dark : theme.light

  return {
    vpcInfoHeader: {
      backgroundColor: colors.vpcInfoHeader,
      color: colors.vpcInfoHeaderText,
    },
    button: {
      backgroundColor: colors.buttonBackground,
      color: colors.buttonText,
    },
    subnetChip: {
      backgroundColor: colors.subnetChip,
      color: colors.subnetChipText,
    },
    usableIps: {
      color: colors.usableIpsText,
    },
    dialogHeader: {
      backgroundColor: colors.dialogHeader,
      color: colors.dialogHeaderText,
    },
    infoBox: {
      backgroundColor: colors.infoBoxBackground,
      borderColor: colors.infoBoxBorder,
    },
  }
}

/**
 * Get background color for a specific cloud provider
 * @param provider - The cloud provider key
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Background color string
 */
export function getBackgroundColor(provider: string, isDarkMode: boolean = false): string {
  const theme = getCloudTheme(provider)
  return isDarkMode ? theme.dark.backgroundColor : theme.light.backgroundColor
}

/**
 * Get title color for a specific cloud provider
 * @param provider - The cloud provider key
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Title color string
 */
export function getTitleColor(provider: string, isDarkMode: boolean = false): string {
  const theme = getCloudTheme(provider)
  return isDarkMode ? theme.dark.titleColor : theme.light.titleColor
}

/**
 * Get navigation bar background color
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Navigation bar background color or undefined for Vuetify default
 */
export function getNavBarBackgroundColor(isDarkMode: boolean = false): string | undefined {
  if (!isDarkMode) return undefined
  // All providers use the same nav bar colors in dark mode
  return cloudThemes['on-premises'].dark.navBarBackground
}

/**
 * Get navigation bar text color
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Navigation bar text color or undefined for Vuetify default
 */
export function getNavBarTextColor(isDarkMode: boolean = false): string | undefined {
  if (!isDarkMode) return undefined
  // All providers use the same nav bar colors in dark mode
  return cloudThemes['on-premises'].dark.navBarText
}

/**
 * Get main panel background color
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Main panel background color or undefined for Vuetify default
 */
export function getMainPanelBackgroundColor(isDarkMode: boolean = false): string | undefined {
  if (!isDarkMode) return undefined
  // All providers use the same main panel colors in dark mode
  return cloudThemes['on-premises'].dark.mainPanelBackground
}

/**
 * Get main panel text color
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Main panel text color or undefined for Vuetify default
 */
export function getMainPanelTextColor(isDarkMode: boolean = false): string | undefined {
  if (!isDarkMode) return undefined
  // All providers use the same main panel colors in dark mode
  return cloudThemes['on-premises'].dark.mainPanelText
}

/**
 * Get nested panel background color
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Nested panel background color or undefined for Vuetify default
 */
export function getNestedPanelBackgroundColor(isDarkMode: boolean = false): string | undefined {
  if (!isDarkMode) return undefined
  // All providers use the same nested panel colors in dark mode
  return cloudThemes['on-premises'].dark.nestedPanelBackground
}

/**
 * Get nested panel text color
 * @param isDarkMode - Whether dark mode is enabled
 * @returns Nested panel text color or undefined for Vuetify default
 */
export function getNestedPanelTextColor(isDarkMode: boolean = false): string | undefined {
  if (!isDarkMode) return undefined
  // All providers use the same nested panel colors in dark mode
  return cloudThemes['on-premises'].dark.nestedPanelText
}
