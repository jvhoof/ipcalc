#!/usr/bin/env python3
"""
Unit tests for refactored IP Calculator (ipcalc.py)

Tests cover:
- Cloud provider configuration
- Subnet calculation
- Hub-spoke topology
- Network info calculation
- Reserved IP handling
- Availability zone distribution
- Output format validation
"""

import unittest
import ipaddress
import json
from cloud_provider_config import (
    get_cloud_provider_config,
    validate_output_format,
    get_availability_zone,
    CLOUD_PROVIDERS
)
from ipcalc import (
    calculate_subnets,
    generate_hub_spoke_topology,
    calculate_network_info
)


class TestCloudProviderConfig(unittest.TestCase):
    """Test cloud provider configuration module"""

    def test_get_azure_config(self):
        """Test Azure configuration"""
        config = get_cloud_provider_config('azure')
        self.assertEqual(config['reserved_ip_count'], 5)
        self.assertEqual(config['max_cidr_prefix'], 8)
        self.assertEqual(config['min_cidr_prefix'], 29)
        self.assertIn('terraform', config['supported_outputs'])

    def test_get_aws_config(self):
        """Test AWS configuration"""
        config = get_cloud_provider_config('aws')
        self.assertEqual(config['reserved_ip_count'], 5)
        self.assertEqual(config['max_cidr_prefix'], 16)
        self.assertEqual(config['min_cidr_prefix'], 28)
        self.assertIn('cloudformation', config['supported_outputs'])

    def test_get_gcp_config(self):
        """Test GCP configuration"""
        config = get_cloud_provider_config('gcp')
        self.assertEqual(config['reserved_ip_count'], 4)
        self.assertIn('gcloud', config['supported_outputs'])

    def test_invalid_provider(self):
        """Test error handling for invalid provider"""
        with self.assertRaises(ValueError):
            get_cloud_provider_config('invalid_provider')

    def test_validate_output_format_azure(self):
        """Test Azure output format validation"""
        self.assertTrue(validate_output_format('azure', 'terraform'))
        self.assertTrue(validate_output_format('azure', 'bicep'))
        self.assertTrue(validate_output_format('azure', 'arm'))
        self.assertFalse(validate_output_format('azure', 'cloudformation'))

    def test_validate_output_format_aws(self):
        """Test AWS output format validation"""
        self.assertTrue(validate_output_format('aws', 'terraform'))
        self.assertTrue(validate_output_format('aws', 'cloudformation'))
        self.assertFalse(validate_output_format('aws', 'bicep'))

    def test_availability_zone_distribution(self):
        """Test round-robin AZ distribution"""
        # Azure
        self.assertEqual(get_availability_zone('azure', 0), '1')
        self.assertEqual(get_availability_zone('azure', 1), '2')
        self.assertEqual(get_availability_zone('azure', 2), '3')
        self.assertEqual(get_availability_zone('azure', 3), '1')  # Wraps around

        # AWS
        aws_az = get_availability_zone('aws', 0)
        self.assertTrue(aws_az.startswith('us-east-1'))


class TestCalculateSubnets(unittest.TestCase):
    """Test calculate_subnets function"""

    def test_basic_azure_subnets(self):
        """Test basic Azure subnet calculation"""
        result = calculate_subnets('10.0.0.0/16', 4, 'azure')

        self.assertEqual(len(result['subnets']), 4)
        self.assertEqual(result['subnets'][0]['cidr'], '10.0.0.0/18')
        self.assertEqual(result['subnets'][1]['cidr'], '10.0.64.0/18')
        self.assertEqual(result['subnets'][2]['cidr'], '10.0.128.0/18')
        self.assertEqual(result['subnets'][3]['cidr'], '10.0.192.0/18')

    def test_basic_aws_subnets(self):
        """Test basic AWS subnet calculation"""
        result = calculate_subnets('10.0.0.0/16', 3, 'aws')

        self.assertEqual(len(result['subnets']), 3)
        self.assertEqual(result['subnets'][0]['cidr'], '10.0.0.0/18')
        self.assertEqual(result['subnets'][1]['cidr'], '10.0.64.0/18')
        self.assertEqual(result['subnets'][2]['cidr'], '10.0.128.0/18')

    def test_custom_subnet_prefix(self):
        """Test custom subnet prefix"""
        result = calculate_subnets('10.0.0.0/16', 16, 'azure', desired_subnet_prefix=20)

        self.assertEqual(len(result['subnets']), 16)
        for subnet in result['subnets']:
            self.assertEqual(subnet['prefix_length'], 20)

    def test_reserved_ip_calculations_azure(self):
        """Test Azure reserved IP calculations"""
        result = calculate_subnets('10.0.0.0/24', 1, 'azure')
        subnet = result['subnets'][0]

        self.assertEqual(subnet['total_ips'], 256)
        self.assertEqual(subnet['usable_ips'], 251)  # 256 - 5 (Azure reserved)
        self.assertEqual(len(subnet['reserved']), 5)
        self.assertIn('10.0.0.0', subnet['reserved'])  # Network
        self.assertIn('10.0.0.1', subnet['reserved'])  # Azure reserved
        self.assertIn('10.0.0.2', subnet['reserved'])  # Azure reserved
        self.assertIn('10.0.0.254', subnet['reserved'])  # Azure reserved
        self.assertEqual(subnet['reserved'][-1], '10.0.0.255')  # Broadcast

    def test_reserved_ip_calculations_aws(self):
        """Test AWS reserved IP calculations"""
        result = calculate_subnets('10.0.0.0/24', 1, 'aws')
        subnet = result['subnets'][0]

        self.assertEqual(subnet['total_ips'], 256)
        self.assertEqual(subnet['usable_ips'], 251)  # 256 - 5 (AWS reserved)
        self.assertEqual(len(subnet['reserved']), 5)

    def test_availability_zone_assignment(self):
        """Test AZ assignment to subnets"""
        result = calculate_subnets('10.0.0.0/16', 4, 'azure')

        self.assertEqual(result['subnets'][0]['availabilityZone'], '1')
        self.assertEqual(result['subnets'][1]['availabilityZone'], '2')
        self.assertEqual(result['subnets'][2]['availabilityZone'], '3')
        self.assertEqual(result['subnets'][3]['availabilityZone'], '1')  # Wraps

    def test_insufficient_capacity(self):
        """Test error when CIDR too small"""
        result = calculate_subnets('10.0.0.0/30', 10, 'azure')
        self.assertIn('error', result)
        self.assertIn('cannot divide', result['error'].lower())

    def test_prefix_too_small(self):
        """Test error when desired prefix too small"""
        result = calculate_subnets('10.0.0.0/16', 2, 'azure', desired_subnet_prefix=10)
        self.assertIn('error', result)
        self.assertIn('larger than network prefix', result['error'].lower())

    def test_prefix_too_large(self):
        """Test error when desired prefix exceeds limits"""
        result = calculate_subnets('10.0.0.0/16', 2, 'azure', desired_subnet_prefix=30)
        self.assertIn('error', result)
        self.assertIn('smaller than cloud provider minimum', result['error'].lower())


class TestHubSpokeTopology(unittest.TestCase):
    """Test hub-spoke topology generation"""

    def test_basic_hub_spoke_azure(self):
        """Test basic hub-spoke for Azure"""
        result = generate_hub_spoke_topology(
            '10.0.0.0/16',
            2,
            ['10.1.0.0/16', '10.2.0.0/16'],
            [2, 2],
            'azure'
        )

        self.assertEqual(len(result['spokes']), 2)

        # Check spoke 1
        spoke1 = result['spokes'][0]
        self.assertEqual(spoke1['cidr'], '10.1.0.0/16')
        self.assertEqual(spoke1['numberOfSubnets'], 2)
        self.assertEqual(len(spoke1['subnets']), 2)

        # Check spoke 2
        spoke2 = result['spokes'][1]
        self.assertEqual(spoke2['cidr'], '10.2.0.0/16')
        self.assertEqual(spoke2['numberOfSubnets'], 2)

    def test_hub_spoke_aws(self):
        """Test hub-spoke for AWS (works but peering not in template)"""
        result = generate_hub_spoke_topology(
            '10.0.0.0/16',
            2,
            ['10.1.0.0/16'],
            [2],
            'aws'
        )
        # Should work, just won't have peering in output
        self.assertNotIn('error', result)
        self.assertEqual(len(result['spokes']), 1)

    def test_hub_spoke_gcp_supported(self):
        """Test that GCP supports hub-spoke"""
        result = generate_hub_spoke_topology(
            '10.0.0.0/16',
            2,
            ['10.1.0.0/16'],
            [2],
            'gcp'
        )
        # Should not have error key
        self.assertNotIn('error', result)
        self.assertEqual(len(result['spokes']), 1)
        self.assertTrue(result['peeringEnabled'])


class TestNetworkInfo(unittest.TestCase):
    """Test network info calculation"""

    def test_network_info_azure(self):
        """Test network info for Azure"""
        network = ipaddress.ip_network('10.0.0.0/24')
        config = get_cloud_provider_config('azure')
        info = calculate_network_info(network, config)

        self.assertEqual(info['network'], '10.0.0.0')
        self.assertEqual(info['network_address'], '10.0.0.0')
        self.assertEqual(info['broadcast_address'], '10.0.0.255')
        self.assertEqual(info['netmask'], '255.255.255.0')
        self.assertEqual(info['total_ips'], 256)
        self.assertEqual(info['usable_ips'], 251)  # 256 - 5 Azure reserved
        self.assertEqual(info['first_usable'], '10.0.0.3')
        self.assertEqual(info['last_usable'], '10.0.0.253')

    def test_network_info_aws(self):
        """Test network info for AWS"""
        network = ipaddress.ip_network('10.0.0.0/24')
        config = get_cloud_provider_config('aws')
        info = calculate_network_info(network, config)

        self.assertEqual(info['usable_ips'], 251)  # 256 - 5 AWS reserved

    def test_network_info_gcp(self):
        """Test network info for GCP"""
        network = ipaddress.ip_network('10.0.0.0/24')
        config = get_cloud_provider_config('gcp')
        info = calculate_network_info(network, config)

        self.assertEqual(info['usable_ips'], 252)  # 256 - 4 GCP reserved

    def test_network_info_onpremises(self):
        """Test network info for on-premises"""
        network = ipaddress.ip_network('10.0.0.0/24')
        config = get_cloud_provider_config('onpremises')
        info = calculate_network_info(network, config)

        self.assertEqual(info['usable_ips'], 254)  # 256 - 2 standard reserved


class TestOutputFormats(unittest.TestCase):
    """Test output format generation"""

    def test_json_output_structure(self):
        """Test JSON output has correct structure"""
        result = calculate_subnets('10.0.0.0/16', 2, 'azure')

        # Should have required fields
        self.assertIn('subnets', result)
        self.assertIsInstance(result['subnets'], list)

        # Each subnet should have required fields
        for subnet in result['subnets']:
            self.assertIn('cidr', subnet)
            self.assertIn('network', subnet)
            self.assertIn('netmask', subnet)
            self.assertIn('total_ips', subnet)
            self.assertIn('usable_ips', subnet)
            self.assertIn('availabilityZone', subnet)
            self.assertIn('reserved', subnet)

    def test_json_serializable(self):
        """Test that result is JSON serializable"""
        result = calculate_subnets('10.0.0.0/16', 2, 'azure')

        # Should not raise exception
        json_str = json.dumps(result)
        self.assertIsInstance(json_str, str)

        # Should be parseable
        parsed = json.loads(json_str)
        self.assertEqual(len(parsed['subnets']), 2)


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and boundary conditions"""

    def test_single_subnet(self):
        """Test creating single subnet"""
        result = calculate_subnets('10.0.0.0/16', 1, 'azure')

        self.assertEqual(len(result['subnets']), 1)
        self.assertEqual(result['subnets'][0]['cidr'], '10.0.0.0/16')

    def test_large_network(self):
        """Test large network splitting"""
        result = calculate_subnets('10.0.0.0/8', 256, 'azure')

        self.assertEqual(len(result['subnets']), 256)
        # All subnets should be /16
        for subnet in result['subnets']:
            self.assertEqual(subnet['prefix_length'], 16)

    def test_small_subnets(self):
        """Test very small subnets"""
        result = calculate_subnets('10.0.0.0/24', 8, 'azure')

        self.assertEqual(len(result['subnets']), 8)
        # All subnets should be /27
        for subnet in result['subnets']:
            self.assertEqual(subnet['prefix_length'], 27)
            self.assertEqual(subnet['total_ips'], 32)

    def test_non_power_of_2_subnets(self):
        """Test non-power of 2 subnet count"""
        result = calculate_subnets('10.0.0.0/16', 3, 'azure')

        # Should round up to 4 (/18 subnets)
        self.assertEqual(len(result['subnets']), 3)
        for subnet in result['subnets']:
            self.assertEqual(subnet['prefix_length'], 18)


class TestProviderSpecifics(unittest.TestCase):
    """Test provider-specific behaviors"""

    def test_azure_reserved_ips(self):
        """Test Azure reserves 5 IPs"""
        result = calculate_subnets('10.0.0.0/29', 1, 'azure')
        subnet = result['subnets'][0]

        self.assertEqual(subnet['total_ips'], 8)
        self.assertEqual(subnet['usable_ips'], 3)  # 8 - 5
        self.assertEqual(len(subnet['reserved']), 5)

    def test_aws_reserved_ips(self):
        """Test AWS reserves 5 IPs"""
        result = calculate_subnets('10.0.0.0/28', 1, 'aws')
        subnet = result['subnets'][0]

        self.assertEqual(subnet['total_ips'], 16)
        self.assertEqual(subnet['usable_ips'], 11)  # 16 - 5

    def test_gcp_reserved_ips(self):
        """Test GCP reserves 4 IPs"""
        result = calculate_subnets('10.0.0.0/29', 1, 'gcp')
        subnet = result['subnets'][0]

        self.assertEqual(subnet['total_ips'], 8)
        self.assertEqual(subnet['usable_ips'], 4)  # 8 - 4

    def test_oracle_reserved_ips(self):
        """Test Oracle reserves 3 IPs"""
        result = calculate_subnets('10.0.0.0/30', 1, 'oracle')
        subnet = result['subnets'][0]

        self.assertEqual(subnet['total_ips'], 4)
        self.assertEqual(subnet['usable_ips'], 1)  # 4 - 3


if __name__ == '__main__':
    unittest.main()
