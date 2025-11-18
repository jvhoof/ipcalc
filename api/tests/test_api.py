"""
Tests for the IPCalc Diagram API
"""
import pytest
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.ip_calculator import (
    calculate_network,
    PROVIDER_CONFIGS,
    cidr_to_subnet_mask
)


class TestIPCalculator:
    """Tests for the IP calculator module"""

    def test_cidr_to_subnet_mask(self):
        """Test CIDR to subnet mask conversion"""
        assert cidr_to_subnet_mask(8) == "255.0.0.0"
        assert cidr_to_subnet_mask(16) == "255.255.0.0"
        assert cidr_to_subnet_mask(24) == "255.255.255.0"
        assert cidr_to_subnet_mask(28) == "255.255.255.240"

    def test_provider_configs_exist(self):
        """Test that all providers have configurations"""
        providers = ["azure", "aws", "gcp", "oracle", "alicloud", "onpremises"]
        for provider in providers:
            assert provider in PROVIDER_CONFIGS
            config = PROVIDER_CONFIGS[provider]
            assert config.reserved_ips > 0
            assert config.min_subnet_size > 0

    def test_calculate_azure_network(self):
        """Test Azure network calculation"""
        result = calculate_network("azure", "10.0.0.0/16", 4)

        assert result.provider == "azure"
        assert result.vpc_cidr == "10.0.0.0/16"
        assert result.vpc_total_ips == 65536
        assert len(result.subnets) == 4

        # Check first subnet
        subnet = result.subnets[0]
        assert subnet.name == "Subnet-1"
        assert "10.0." in subnet.network_address
        assert subnet.total_ips > 0
        assert subnet.usable_ips == subnet.total_ips - 5  # Azure reserves 5

    def test_calculate_aws_network(self):
        """Test AWS network calculation"""
        result = calculate_network("aws", "10.0.0.0/16", 6)

        assert result.provider == "aws"
        assert len(result.subnets) == 6

        # Check availability zones are assigned
        zones = [s.availability_zone for s in result.subnets]
        assert all(z.startswith("us-east-1") for z in zones)

    def test_calculate_gcp_network(self):
        """Test GCP network calculation"""
        result = calculate_network("gcp", "192.168.0.0/20", 3)

        assert result.provider == "gcp"
        assert result.vpc_cidr == "192.168.0.0/20"
        assert len(result.subnets) == 3

        # GCP reserves 4 IPs
        for subnet in result.subnets:
            assert subnet.usable_ips == subnet.total_ips - 4

    def test_calculate_oracle_network(self):
        """Test Oracle network calculation"""
        result = calculate_network("oracle", "10.0.0.0/16", 3)

        assert result.provider == "oracle"
        assert len(result.subnets) == 3

        # Oracle reserves 3 IPs
        for subnet in result.subnets:
            assert subnet.usable_ips == subnet.total_ips - 3

    def test_calculate_alicloud_network(self):
        """Test Alibaba Cloud network calculation"""
        result = calculate_network("alicloud", "172.16.0.0/12", 4)

        assert result.provider == "alicloud"
        assert len(result.subnets) == 4

    def test_calculate_onpremises_network(self):
        """Test On-Premises network calculation"""
        result = calculate_network("onpremises", "192.168.1.0/24", 2)

        assert result.provider == "onpremises"
        assert result.vpc_cidr == "192.168.1.0/24"
        assert len(result.subnets) == 2

        # On-premises reserves only 2 IPs (network + broadcast)
        for subnet in result.subnets:
            assert subnet.usable_ips == subnet.total_ips - 2

    def test_custom_prefix(self):
        """Test custom subnet prefix"""
        result = calculate_network("azure", "10.0.0.0/16", 4, custom_prefix=24)

        assert result.subnet_prefix == 24
        for subnet in result.subnets:
            assert "/24" in subnet.cidr
            assert subnet.total_ips == 256

    def test_invalid_provider(self):
        """Test invalid provider raises error"""
        with pytest.raises(ValueError) as exc_info:
            calculate_network("invalid", "10.0.0.0/16", 4)
        assert "Invalid provider" in str(exc_info.value)

    def test_invalid_cidr(self):
        """Test invalid CIDR raises error"""
        with pytest.raises(ValueError) as exc_info:
            calculate_network("azure", "invalid", 4)
        assert "Invalid CIDR" in str(exc_info.value)

    def test_too_many_subnets(self):
        """Test too many subnets raises error"""
        with pytest.raises(ValueError) as exc_info:
            calculate_network("azure", "10.0.0.0/16", 300)
        assert "between 1 and 256" in str(exc_info.value)

    def test_subnet_too_small(self):
        """Test subnet that's too small for provider"""
        # Azure minimum is /29, try to create in /30 space
        with pytest.raises(ValueError):
            calculate_network("azure", "10.0.0.0/30", 1)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
