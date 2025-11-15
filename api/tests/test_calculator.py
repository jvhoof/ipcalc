"""
Unit tests for IP calculator core logic
"""

import pytest
from api.core.ip_calculator import (
    parse_ip,
    parse_cidr,
    ip_to_number,
    number_to_ip,
    cidr_to_mask,
    calculate_network,
    calculate_subnets
)
from api.config.cloud_providers import get_cloud_provider_config


class TestIPParsing:
    """Test IP address parsing functions"""

    def test_parse_ip_valid(self):
        """Test parsing valid IP addresses"""
        assert parse_ip("10.0.0.0") == [10, 0, 0, 0]
        assert parse_ip("192.168.1.1") == [192, 168, 1, 1]
        assert parse_ip("255.255.255.255") == [255, 255, 255, 255]

    def test_parse_ip_invalid(self):
        """Test parsing invalid IP addresses"""
        assert parse_ip("256.0.0.0") is None
        assert parse_ip("10.0.0") is None
        assert parse_ip("10.0.0.0.0") is None
        assert parse_ip("abc.def.ghi.jkl") is None

    def test_parse_cidr_valid(self):
        """Test parsing valid CIDR notation"""
        result = parse_cidr("10.0.0.0/16", 8, 29)
        assert result is not None
        assert result["ip"] == [10, 0, 0, 0]
        assert result["prefix"] == 16

    def test_parse_cidr_invalid(self):
        """Test parsing invalid CIDR notation"""
        assert parse_cidr("10.0.0.0", 8, 29) is None  # Missing prefix
        assert parse_cidr("10.0.0.0/33", 8, 29) is None  # Prefix out of range
        assert parse_cidr("10.0.0.0/7", 8, 29) is None  # Prefix below min


class TestIPConversion:
    """Test IP number conversion functions"""

    def test_ip_to_number(self):
        """Test converting IP array to number"""
        assert ip_to_number([10, 0, 0, 0]) == 167772160
        assert ip_to_number([192, 168, 1, 1]) == 3232235777
        assert ip_to_number([0, 0, 0, 0]) == 0

    def test_number_to_ip(self):
        """Test converting number to IP array"""
        assert number_to_ip(167772160) == [10, 0, 0, 0]
        assert number_to_ip(3232235777) == [192, 168, 1, 1]
        assert number_to_ip(0) == [0, 0, 0, 0]

    def test_cidr_to_mask(self):
        """Test converting CIDR prefix to subnet mask"""
        assert cidr_to_mask(24) == [255, 255, 255, 0]
        assert cidr_to_mask(16) == [255, 255, 0, 0]
        assert cidr_to_mask(8) == [255, 0, 0, 0]
        assert cidr_to_mask(32) == [255, 255, 255, 255]


class TestNetworkCalculation:
    """Test network calculation functions"""

    def test_calculate_network_azure(self):
        """Test network calculation for Azure"""
        config = get_cloud_provider_config("azure")
        network = calculate_network("10.0.0.0/16", config)

        assert network is not None
        assert network.network == "10.0.0.0"
        assert network.total_ips == 65536
        assert network.first_ip == "10.0.0.0"
        assert network.last_ip == "10.0.255.255"

    def test_calculate_network_aws(self):
        """Test network calculation for AWS"""
        config = get_cloud_provider_config("aws")
        network = calculate_network("172.16.0.0/16", config)

        assert network is not None
        assert network.network == "172.16.0.0"
        assert network.total_ips == 65536


class TestSubnetCalculation:
    """Test subnet calculation functions"""

    def test_calculate_subnets_azure(self):
        """Test subnet calculation for Azure"""
        config = get_cloud_provider_config("azure")
        result = calculate_subnets("10.0.0.0/16", 4, config, 24)

        assert "error" not in result or result["error"] is None
        assert len(result["subnets"]) == 4

        # Check first subnet
        subnet = result["subnets"][0]
        assert subnet.cidr == "10.0.0.0/24"
        assert subnet.total_ips == 256
        assert subnet.usable_ips == 251  # 256 - 5 reserved for Azure

    def test_calculate_subnets_automatic_prefix(self):
        """Test automatic subnet prefix calculation"""
        config = get_cloud_provider_config("azure")
        result = calculate_subnets("10.0.0.0/16", 4, config)

        assert "error" not in result or result["error"] is None
        assert len(result["subnets"]) == 4

    def test_calculate_subnets_error_invalid_cidr(self):
        """Test error handling for invalid CIDR"""
        config = get_cloud_provider_config("azure")
        result = calculate_subnets("invalid", 4, config)

        assert "error" in result
        assert result["error"] is not None

    def test_calculate_subnets_error_too_many(self):
        """Test error handling for too many subnets"""
        config = get_cloud_provider_config("azure")
        result = calculate_subnets("10.0.0.0/16", 300, config)

        assert "error" in result
        assert "must be between 1 and 256" in result["error"]

    def test_calculate_subnets_aws_with_zones(self):
        """Test AWS subnet calculation with availability zones"""
        config = get_cloud_provider_config("aws")
        result = calculate_subnets("172.16.0.0/16", 3, config)

        assert len(result["subnets"]) == 3

        # Check that subnets have availability zones assigned
        for subnet in result["subnets"]:
            assert subnet.availability_zone is not None
            assert subnet.availability_zone.startswith("us-east-1")


class TestCloudProviderConfigs:
    """Test cloud provider configurations"""

    def test_all_providers_exist(self):
        """Test that all providers are configured"""
        providers = ["azure", "aws", "gcp", "oracle", "alicloud", "onpremises"]
        for provider in providers:
            config = get_cloud_provider_config(provider)
            assert config is not None
            assert config.reserved_ip_count > 0
            assert config.min_cidr_prefix > 0
            assert config.max_cidr_prefix > 0

    def test_azure_config(self):
        """Test Azure-specific configuration"""
        config = get_cloud_provider_config("azure")
        assert config.reserved_ip_count == 5
        assert config.min_cidr_prefix == 29
        assert config.max_cidr_prefix == 8

    def test_aws_config(self):
        """Test AWS-specific configuration"""
        config = get_cloud_provider_config("aws")
        assert config.reserved_ip_count == 5
        assert config.min_cidr_prefix == 28
        assert len(config.availability_zones) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
