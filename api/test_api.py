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

PROBLEM_CONTENT_TYPE = 'application/problem+json'


def assert_problem(resp, expected_status: int) -> dict:
    """Assert the response is an RFC 9457 Problem Details object and return the body."""
    assert resp.status_code == expected_status
    assert PROBLEM_CONTENT_TYPE in resp.headers['content-type']
    body = resp.json()
    assert body['type'] == 'about:blank'
    assert body['status'] == expected_status
    assert 'title' in body
    assert 'detail' in body
    return body


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
        body = assert_problem(resp, 400)
        assert 'bicep' in body['detail']

    def test_missing_cidr(self):
        resp = client.get('/api/gcp', params={'subnets': 2, 'format': 'terraform'})
        assert_problem(resp, 422)

    def test_missing_subnets(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'format': 'terraform'})
        assert_problem(resp, 422)

    def test_missing_format(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2})
        assert_problem(resp, 422)

    def test_subnets_too_small(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 0, 'format': 'terraform'})
        assert_problem(resp, 422)

    def test_cidr_too_small(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/30', 'subnets': 100, 'format': 'terraform'})
        assert_problem(resp, 400)

    def test_spoke_subnets_not_integers(self):
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': '10.1.0.0/16',
            'spoke-subnets': 'abc',
        })
        assert_problem(resp, 400)


# ---------------------------------------------------------------------------
# RFC 9457 compliance
# ---------------------------------------------------------------------------

class TestRFC9457Compliance:
    """Verify every error path returns a valid Problem Details object."""

    def test_400_invalid_cidr(self):
        resp = client.get('/api/aws', params={'cidr': 'not-a-cidr', 'subnets': 2, 'format': 'terraform'})
        body = assert_problem(resp, 400)
        assert 'not a valid CIDR' in body['detail']

    def test_400_ipv6_cidr(self):
        resp = client.get('/api/aws', params={'cidr': '2001:db8::/32', 'subnets': 2, 'format': 'terraform'})
        body = assert_problem(resp, 400)
        assert 'IPv6' in body['detail']

    def test_400_invalid_format(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'invalid'})
        body = assert_problem(resp, 400)
        assert 'invalid' in body['detail']
        assert body['title'] == 'Bad Request'

    def test_422_missing_required_param(self):
        resp = client.get('/api/aws', params={'subnets': 2, 'format': 'terraform'})
        body = assert_problem(resp, 422)
        assert 'cidr' in body['detail']
        assert 'Unprocessable' in body['title']

    def test_422_out_of_range_subnets(self):
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 0, 'format': 'terraform'})
        body = assert_problem(resp, 422)
        assert 'subnets' in body['detail']

    def test_422_prefix_too_large(self):
        resp = client.get('/api/aws', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'terraform', 'prefix': 33})
        body = assert_problem(resp, 422)
        assert 'prefix' in body['detail']

    def test_problem_content_type_on_400(self):
        resp = client.get('/api/gcp', params={'cidr': '10.0.0.0/16', 'subnets': 2, 'format': 'arm'})
        assert PROBLEM_CONTENT_TYPE in resp.headers['content-type']

    def test_problem_content_type_on_422(self):
        resp = client.get('/api/gcp', params={'subnets': 2, 'format': 'terraform'})
        assert PROBLEM_CONTENT_TYPE in resp.headers['content-type']

    def test_status_field_matches_http_status(self):
        """RFC 9457 §3.1: status member MUST match the actual HTTP status code."""
        for params, expected in [
            ({'cidr': 'bad', 'subnets': 2, 'format': 'terraform'}, 400),
            ({'subnets': 2, 'format': 'terraform'}, 422),
        ]:
            resp = client.get('/api/aws', params=params)
            assert resp.status_code == expected
            assert resp.json()['status'] == expected

    def test_type_is_about_blank(self):
        """RFC 9457 §3.1: type defaults to about:blank when no type URI is registered."""
        resp = client.get('/api/aws', params={'cidr': 'bad', 'subnets': 2, 'format': 'terraform'})
        assert resp.json()['type'] == 'about:blank'

    def test_spoke_count_exceeded(self):
        spoke_cidrs = ','.join(f'10.{i}.0.0/16' for i in range(1, 12))  # 11 spokes
        resp = client.get('/api/gcp', params={
            'cidr': '10.0.0.0/8',
            'subnets': 2,
            'format': 'terraform',
            'spoke-cidrs': spoke_cidrs,
        })
        body = assert_problem(resp, 400)
        assert '11' in body['detail']


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
        assert_problem(resp, 400)

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
        assert_problem(resp, 400)

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


# ---------------------------------------------------------------------------
# Azure – D2 diagram
# ---------------------------------------------------------------------------

class TestAzureD2:
    def test_single_vnet_status(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 4, 'format': 'd2'})
        assert resp.status_code == 200

    def test_single_vnet_content_type(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 4, 'format': 'd2'})
        assert 'text/plain' in resp.headers['content-type']

    def test_single_vnet_filename_header(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 4, 'format': 'd2'})
        assert 'diagram.d2' in resp.headers['content-disposition']

    def test_single_vnet_d2_structure(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 4, 'format': 'd2'})
        assert resp.status_code == 200
        body = resp.text
        assert 'classes:' in body
        assert 'resource_group' in body
        assert 'vnet' in body
        assert 'direction: right' in body

    def test_single_vnet_cidr_in_output(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 4, 'format': 'd2'})
        assert '10.0.0.0/16' in resp.text

    def test_single_vnet_subnet_count(self):
        resp = client.get('/api/azure', params={'cidr': '10.0.0.0/16', 'subnets': 4, 'format': 'd2'})
        body = resp.text
        # Each subnet block appears as "subnet{n}:"
        for i in range(1, 5):
            assert f'subnet{i}:' in body

    def test_hub_spoke_peering_edges(self):
        resp = client.get('/api/azure', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'd2',
            'spoke-cidrs': '10.1.0.0/16,10.2.0.0/16',
            'spoke-subnets': '2,2',
        })
        assert resp.status_code == 200
        body = resp.text
        assert 'hub_rg' in body
        assert 'spoke1_rg' in body
        assert 'spoke2_rg' in body
        assert '<->' in body

    def test_hub_spoke_spoke_cidrs_in_output(self):
        resp = client.get('/api/azure', params={
            'cidr': '10.0.0.0/16',
            'subnets': 2,
            'format': 'd2',
            'spoke-cidrs': '10.1.0.0/16',
            'spoke-subnets': '2',
        })
        assert '10.1.0.0/16' in resp.text
