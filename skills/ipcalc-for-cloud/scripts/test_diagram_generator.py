"""Unit tests for AzureDiagramGenerator."""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from diagram_generator import AzureDiagramGenerator


def _make_subnet(name: str, cidr: str, usable: int, idx: int) -> dict:
    return {
        "name": name,
        "cidr": cidr,
        "index": idx,
        "usable_ips": usable,
        "usableIPs": usable,
    }


def _single_vnet_data(cidr: str = "10.0.0.0/16", n: int = 4) -> dict:
    subnets = [
        _make_subnet(f"subnet{i}", f"10.{i * 64}.0.0/18", 16379, i)
        for i in range(1, n + 1)
    ]
    return {
        "vnetCidr": cidr,
        "subnets": subnets,
        "peeringEnabled": False,
        "spokeVNets": [],
    }


def _hub_spoke_data() -> dict:
    hub_subnets = [
        _make_subnet("subnet1", "10.0.0.0/17", 32763, 1),
        _make_subnet("subnet2", "10.0.128.0/17", 32763, 2),
    ]
    spoke1_subnets = [
        _make_subnet("subnet1", "10.1.0.0/17", 32763, 1),
        _make_subnet("subnet2", "10.1.128.0/17", 32763, 2),
    ]
    spoke2_subnets = [
        _make_subnet("subnet1", "10.2.0.0/17", 32763, 1),
        _make_subnet("subnet2", "10.2.128.0/17", 32763, 2),
    ]
    return {
        "vnetCidr": "10.0.0.0/16",
        "subnets": hub_subnets,
        "peeringEnabled": True,
        "spokeVNets": [
            {"cidr": "10.1.0.0/16", "subnets": spoke1_subnets, "index": 1},
            {"cidr": "10.2.0.0/16", "subnets": spoke2_subnets, "index": 2},
        ],
    }


class TestAzureDiagramGeneratorSingleVNet(unittest.TestCase):

    def setUp(self):
        self.gen = AzureDiagramGenerator()
        self.output = self.gen.generate(_single_vnet_data())

    def test_header_present(self):
        self.assertIn("# Azure Network Diagram", self.output)
        self.assertIn("direction: right", self.output)

    def test_classes_present(self):
        self.assertIn("classes:", self.output)
        self.assertIn("resource_group:", self.output)
        self.assertIn("vnet:", self.output)
        self.assertIn("subnet:", self.output)
        self.assertIn("peering:", self.output)

    def test_resource_group_container(self):
        self.assertIn("myproject_rg:", self.output)
        self.assertIn("class: resource_group", self.output)

    def test_vnet_container(self):
        self.assertIn("myproject_vnet:", self.output)
        self.assertIn("class: vnet", self.output)
        self.assertIn("shape: image", self.output)
        self.assertIn("10.0.0.0/16", self.output)

    def test_subnet_icon_url(self):
        # VNets are containers (no icon allowed); subnets carry the icon instead
        self.assertIn("miiitch/skill-diagram-generators", self.output)
        self.assertIn("Virtual-Networks-Subnets.png", self.output)

    def test_four_subnets_present(self):
        for i in range(1, 5):
            self.assertIn(f"subnet{i}:", self.output)

    def test_subnet_label_includes_cidr(self):
        # Mock data builds subnets as 10.{i*64}.0.0/18; subnet1 → 10.64.0.0/18
        self.assertIn("10.64.0.0/18", self.output)

    def test_subnet_label_includes_usable_ips(self):
        self.assertIn("16,379 usable IPs", self.output)

    def test_no_peering_edges_for_single_vnet(self):
        self.assertNotIn("<->", self.output)


class TestAzureDiagramGeneratorHubSpoke(unittest.TestCase):

    def setUp(self):
        self.gen = AzureDiagramGenerator()
        self.output = self.gen.generate(_hub_spoke_data())

    def test_hub_rg_present(self):
        self.assertIn("hub_rg:", self.output)

    def test_spoke_rgs_present(self):
        self.assertIn("spoke1_rg:", self.output)
        self.assertIn("spoke2_rg:", self.output)

    def test_hub_vnet_present(self):
        self.assertIn("hub_vnet:", self.output)
        self.assertIn("Hub VNet", self.output)

    def test_spoke_vnets_present(self):
        self.assertIn("spoke1_vnet:", self.output)
        self.assertIn("spoke2_vnet:", self.output)

    def test_bidirectional_peering_edges(self):
        self.assertIn("hub_rg.hub_vnet <-> spoke1_rg.spoke1_vnet", self.output)
        self.assertIn("hub_rg.hub_vnet <-> spoke2_rg.spoke2_vnet", self.output)

    def test_peering_class_applied(self):
        self.assertIn("class: peering", self.output)

    def test_spoke_cidrs_in_labels(self):
        self.assertIn("10.1.0.0/16", self.output)
        self.assertIn("10.2.0.0/16", self.output)


class TestSanitizeId(unittest.TestCase):

    def setUp(self):
        self.gen = AzureDiagramGenerator()

    def test_hyphens_replaced(self):
        self.assertEqual(self.gen._sanitize_id("my-resource"), "my_resource")

    def test_dots_replaced(self):
        self.assertEqual(self.gen._sanitize_id("10.0.0.0"), "10_0_0_0")

    def test_spaces_replaced(self):
        self.assertEqual(self.gen._sanitize_id("my resource"), "my_resource")

    def test_slashes_replaced(self):
        self.assertEqual(self.gen._sanitize_id("a/b"), "a_b")

    def test_clean_name_unchanged(self):
        self.assertEqual(self.gen._sanitize_id("subnet1"), "subnet1")


class TestSubnetLabel(unittest.TestCase):

    def setUp(self):
        self.gen = AzureDiagramGenerator()

    def test_label_contains_name(self):
        subnet = _make_subnet("subnet1", "10.0.0.0/18", 16379, 1)
        label = self.gen._subnet_label(subnet)
        self.assertIn("subnet1", label)

    def test_label_contains_cidr(self):
        subnet = _make_subnet("subnet1", "10.0.0.0/18", 16379, 1)
        label = self.gen._subnet_label(subnet)
        self.assertIn("10.0.0.0/18", label)

    def test_label_contains_formatted_usable_ips(self):
        subnet = _make_subnet("subnet1", "10.0.0.0/18", 16379, 1)
        label = self.gen._subnet_label(subnet)
        self.assertIn("16,379 usable IPs", label)

    def test_label_without_usable_ips(self):
        subnet = {"name": "subnet1", "cidr": "10.0.0.0/18"}
        label = self.gen._subnet_label(subnet)
        self.assertIn("subnet1", label)
        self.assertIn("10.0.0.0/18", label)


if __name__ == "__main__":
    unittest.main()
