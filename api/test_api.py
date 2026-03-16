#!/usr/bin/env python3
"""
FastAPI integration tests for the ipcalc API server.

Run with:
  cd api && python -m pytest test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# GCP – terraform
# ---------------------------------------------------------------------------

class TestGcpTerraform:
    def test_basic_request(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 3, 'format': 'terraform'})
        assert resp.status_code == 200
        assert 'google_compute_network' in resp.text
        assert 'google_compute_subnetwork' in resp.text

    def test_content_type(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'terraform'})
        assert resp.status_code == 200
        assert 'text/plain' in resp.headers['content-type']

    def test_filename_header(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'terraform'})
        assert resp.status_code == 200
        assert 'main.tf' in resp.headers['content-disposition']

    def test_custom_prefix(self):
        # prefix=20 matches the natural split of 16 subnets in a /16 (16+4=20)
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 16, 'format': 'terraform', 'prefix': 20})
        assert resp.status_code == 200
        assert '10.0.0.0/20' in resp.text

    def test_subnet_cidrs_in_output(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'terraform'})
        assert resp.status_code == 200
        # Both subnets from a /16 split into 2 should appear
        assert '10.0.0.0/17' in resp.text
        assert '10.0.128.0/17' in resp.text

    def test_hub_spoke_peering(self):
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': '10.1.0.0/16',
            'spoke-subnets': '2',
        })
        assert resp.status_code == 200
        assert 'google_compute_network_peering' in resp.text

    def test_hub_spoke_default_spoke_subnets(self):
        """Omitting spoke-subnets should default to 2 per spoke."""
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': '10.1.0.0/16',
        })
        assert resp.status_code == 200
        assert 'google_compute_network_peering' in resp.text

    def test_hub_spoke_mismatch_error(self):
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': '10.1.0.0/16,10.2.0.0/16',
            'spoke-subnets': '2',  # Only one count for two spokes
        })
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GCP – gcloud CLI
# ---------------------------------------------------------------------------

class TestGcpGcloud:
    def test_basic_request(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'gcloud'})
        assert resp.status_code == 200
        assert 'gcloud compute networks create' in resp.text
        assert 'gcloud compute networks subnets create' in resp.text

    def test_content_type(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'gcloud'})
        assert resp.status_code == 200
        assert 'shellscript' in resp.headers['content-type'] or 'text/' in resp.headers['content-type']

    def test_filename_header(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'gcloud'})
        assert resp.status_code == 200
        assert 'deploy.sh' in resp.headers['content-disposition']

    def test_subnet_ranges_in_output(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'gcloud'})
        assert resp.status_code == 200
        assert '10.0.0.0/17' in resp.text
        assert '10.0.128.0/17' in resp.text

    def test_private_ip_google_access_flag(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'gcloud'})
        assert resp.status_code == 200
        assert '--enable-private-ip-google-access' in resp.text

    def test_hub_spoke_peering(self):
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'gcloud',
            'spoke-cidrs': '10.1.0.0/16',
            'spoke-subnets': '2',
        })
        assert resp.status_code == 200
        assert 'gcloud compute networks peerings create' in resp.text


# ---------------------------------------------------------------------------
# GCP – validation errors
# ---------------------------------------------------------------------------

class TestGcpValidation:
    def test_invalid_format(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'bicep'})
        assert resp.status_code == 400
        assert 'bicep' in resp.json()['detail']

    def test_missing_cidr(self):
        resp = client.get('/api/gcp', params={'subnets': 2, 'format': 'terraform'})
        assert resp.status_code == 422

    def test_missing_subnets(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'format': 'terraform'})
        assert resp.status_code == 422

    def test_missing_format(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2})
        assert resp.status_code == 422

    def test_subnets_too_small(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 0, 'format': 'terraform'})
        assert resp.status_code == 422

    def test_cidr_too_small(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/30', 'subnets': 100, 'format': 'terraform'})
        assert resp.status_code == 400

    def test_spoke_subnets_not_integers(self):
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': '10.1.0.0/16',
            'spoke-subnets': 'abc',
        })
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# AWS – sanity checks (existing endpoint)
# ---------------------------------------------------------------------------

class TestAws:
    def test_terraform(self):
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 3, 'format': 'terraform'})
        assert resp.status_code == 200
        assert 'aws_vpc' in resp.text

    def test_cloudformation(self):
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'cloudformation'})
        assert resp.status_code == 200
        assert 'AWS::EC2::VPC' in resp.text

    def test_cli(self):
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'cli'})
        assert resp.status_code == 200
        assert 'aws ec2 create-vpc' in resp.text

    def test_invalid_format(self):
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'gcloud'})
        assert resp.status_code == 400

    def test_custom_prefix(self):
        # prefix=20 matches the natural split of 16 subnets in a /16 (16+4=20)
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 16, 'format': 'terraform', 'prefix': 20})
        assert resp.status_code == 200
        assert '10.0.0.0/20' in resp.text


# ---------------------------------------------------------------------------
# Azure – sanity checks (existing endpoint)
# ---------------------------------------------------------------------------

class TestAzure:
    def test_terraform(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'terraform'})
        assert resp.status_code == 200
        assert 'azurerm_virtual_network' in resp.text

    def test_bicep(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'bicep'})
        assert resp.status_code == 200
        assert 'Microsoft.Network/virtualNetworks' in resp.text

    def test_invalid_format(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'cloudformation'})
        assert resp.status_code == 400

    def test_hub_spoke_terraform(self):
        resp = client.get('/api/azure', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': '10.1.0.0/16',
            'spoke-subnets': '2',
        })
        assert resp.status_code == 200
        assert 'azurerm_virtual_network_peering' in resp.text
