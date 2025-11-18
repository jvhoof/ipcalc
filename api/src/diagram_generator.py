"""
Diagram Generator module - Creates network diagrams using the diagrams library
"""
import os
import tempfile
import xml.etree.ElementTree as ET
from typing import Optional
import base64

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.network import VPC as AWSVPC, PublicSubnet, PrivateSubnet, InternetGateway, NATGateway
from diagrams.aws.compute import EC2
from diagrams.azure.network import VirtualNetworks, Subnets, ApplicationGateway
from diagrams.azure.compute import VM
from diagrams.gcp.network import VPC as GCPVPC, Subnetwork, FirewallRules
from diagrams.gcp.compute import ComputeEngine
from diagrams.onprem.network import Internet
from diagrams.generic.network import Subnet, Router, Switch, Firewall
from diagrams.generic.compute import Rack

from .ip_calculator import NetworkCalculation, SubnetInfo


# Provider-specific colors
PROVIDER_COLORS = {
    "azure": "#0078D4",
    "aws": "#FF9900",
    "gcp": "#4285F4",
    "oracle": "#C74634",
    "alicloud": "#FF6B2C",
    "onpremises": "#666666"
}


def generate_diagram(
    calculation: NetworkCalculation,
    output_format: str = "png",
    filename: Optional[str] = None,
    show: bool = False
) -> str:
    """
    Generate a network diagram based on the network calculation

    Args:
        calculation: NetworkCalculation result from ip_calculator
        output_format: Output format (png, svg, pdf, dot)
        filename: Optional custom filename (without extension)
        show: Whether to open the diagram after generation

    Returns:
        Path to the generated diagram file
    """
    if output_format.lower() == "drawio":
        return generate_drawio_diagram(calculation, filename)

    # Use temp directory if no filename specified
    if filename is None:
        temp_dir = tempfile.mkdtemp()
        filename = os.path.join(temp_dir, f"{calculation.provider}_network")

    # Ensure directory exists
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)

    provider = calculation.provider.lower()

    # Create diagram based on provider
    if provider == "azure":
        return _generate_azure_diagram(calculation, output_format, filename, show)
    elif provider == "aws":
        return _generate_aws_diagram(calculation, output_format, filename, show)
    elif provider == "gcp":
        return _generate_gcp_diagram(calculation, output_format, filename, show)
    elif provider == "oracle":
        return _generate_oracle_diagram(calculation, output_format, filename, show)
    elif provider == "alicloud":
        return _generate_alicloud_diagram(calculation, output_format, filename, show)
    else:  # onpremises
        return _generate_onprem_diagram(calculation, output_format, filename, show)


def _generate_azure_diagram(
    calc: NetworkCalculation,
    output_format: str,
    filename: str,
    show: bool
) -> str:
    """Generate Azure VNet diagram"""
    graph_attr = {
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "ortho"
    }

    with Diagram(
        f"Azure VNet - {calc.vpc_cidr}",
        filename=filename,
        outformat=output_format,
        show=show,
        direction="TB",
        graph_attr=graph_attr
    ):
        internet = Internet("Internet")

        with Cluster(f"Azure VNet\n{calc.vpc_cidr}\n{calc.vpc_total_ips} IPs"):
            gateway = ApplicationGateway("Gateway")

            subnets = []
            for subnet in calc.subnets:
                with Cluster(f"{subnet.name}\n{subnet.cidr}\n{subnet.usable_ips} usable IPs\n{subnet.availability_zone}"):
                    vm = VM(f"Resources")
                    subnet_node = Subnets(subnet.network_address)
                    subnets.append(subnet_node)

            internet >> gateway
            for subnet in subnets:
                gateway >> subnet

    return f"{filename}.{output_format}"


def _generate_aws_diagram(
    calc: NetworkCalculation,
    output_format: str,
    filename: str,
    show: bool
) -> str:
    """Generate AWS VPC diagram"""
    graph_attr = {
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "ortho"
    }

    with Diagram(
        f"AWS VPC - {calc.vpc_cidr}",
        filename=filename,
        outformat=output_format,
        show=show,
        direction="TB",
        graph_attr=graph_attr
    ):
        internet = Internet("Internet")

        with Cluster(f"VPC: {calc.vpc_cidr}\nTotal IPs: {calc.vpc_total_ips}"):
            igw = InternetGateway("IGW")

            # Group subnets by availability zone
            az_groups = {}
            for subnet in calc.subnets:
                az = subnet.availability_zone or "default"
                if az not in az_groups:
                    az_groups[az] = []
                az_groups[az].append(subnet)

            subnet_nodes = []
            for az, az_subnets in az_groups.items():
                with Cluster(f"Availability Zone: {az}"):
                    for subnet in az_subnets:
                        with Cluster(f"{subnet.name}\n{subnet.cidr}\n{subnet.usable_ips} usable"):
                            ec2 = EC2("EC2")
                            # Alternate between public and private subnet icons
                            idx = calc.subnets.index(subnet)
                            if idx % 2 == 0:
                                sn = PublicSubnet(subnet.network_address)
                            else:
                                sn = PrivateSubnet(subnet.network_address)
                            subnet_nodes.append(sn)

            internet >> igw
            for sn in subnet_nodes:
                igw >> sn

    return f"{filename}.{output_format}"


def _generate_gcp_diagram(
    calc: NetworkCalculation,
    output_format: str,
    filename: str,
    show: bool
) -> str:
    """Generate GCP VPC diagram"""
    graph_attr = {
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "ortho"
    }

    with Diagram(
        f"GCP VPC - {calc.vpc_cidr}",
        filename=filename,
        outformat=output_format,
        show=show,
        direction="TB",
        graph_attr=graph_attr
    ):
        internet = Internet("Internet")

        with Cluster(f"VPC Network\n{calc.vpc_cidr}\n{calc.vpc_total_ips} IPs"):
            firewall = FirewallRules("Firewall")

            subnet_nodes = []
            for subnet in calc.subnets:
                region = subnet.availability_zone or "default-region"
                with Cluster(f"{subnet.name} ({region})\n{subnet.cidr}\n{subnet.usable_ips} usable"):
                    gce = ComputeEngine("GCE")
                    sn = Subnetwork(subnet.network_address)
                    subnet_nodes.append(sn)

            internet >> firewall
            for sn in subnet_nodes:
                firewall >> sn

    return f"{filename}.{output_format}"


def _generate_oracle_diagram(
    calc: NetworkCalculation,
    output_format: str,
    filename: str,
    show: bool
) -> str:
    """Generate Oracle Cloud VCN diagram"""
    graph_attr = {
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "ortho"
    }

    with Diagram(
        f"Oracle VCN - {calc.vpc_cidr}",
        filename=filename,
        outformat=output_format,
        show=show,
        direction="TB",
        graph_attr=graph_attr
    ):
        internet = Internet("Internet")

        with Cluster(f"Virtual Cloud Network\n{calc.vpc_cidr}\n{calc.vpc_total_ips} IPs"):
            router = Router("DRG")

            subnet_nodes = []
            for subnet in calc.subnets:
                ad = subnet.availability_zone or "AD-1"
                with Cluster(f"{subnet.name} ({ad})\n{subnet.cidr}\n{subnet.usable_ips} usable"):
                    server = Rack("Compute")
                    sn = Subnet(subnet.network_address)
                    subnet_nodes.append(sn)

            internet >> router
            for sn in subnet_nodes:
                router >> sn

    return f"{filename}.{output_format}"


def _generate_alicloud_diagram(
    calc: NetworkCalculation,
    output_format: str,
    filename: str,
    show: bool
) -> str:
    """Generate Alibaba Cloud VPC diagram"""
    graph_attr = {
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "ortho"
    }

    with Diagram(
        f"Alibaba Cloud VPC - {calc.vpc_cidr}",
        filename=filename,
        outformat=output_format,
        show=show,
        direction="TB",
        graph_attr=graph_attr
    ):
        internet = Internet("Internet")

        with Cluster(f"VPC\n{calc.vpc_cidr}\n{calc.vpc_total_ips} IPs"):
            router = Router("VRouter")

            subnet_nodes = []
            for subnet in calc.subnets:
                zone = subnet.availability_zone or "default-zone"
                with Cluster(f"{subnet.name} ({zone})\n{subnet.cidr}\n{subnet.usable_ips} usable"):
                    server = Rack("ECS")
                    sn = Subnet(subnet.network_address)
                    subnet_nodes.append(sn)

            internet >> router
            for sn in subnet_nodes:
                router >> sn

    return f"{filename}.{output_format}"


def _generate_onprem_diagram(
    calc: NetworkCalculation,
    output_format: str,
    filename: str,
    show: bool
) -> str:
    """Generate On-Premises network diagram"""
    graph_attr = {
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "ortho"
    }

    with Diagram(
        f"On-Premises Network - {calc.vpc_cidr}",
        filename=filename,
        outformat=output_format,
        show=show,
        direction="TB",
        graph_attr=graph_attr
    ):
        internet = Internet("Internet")

        with Cluster(f"Network\n{calc.vpc_cidr}\n{calc.vpc_total_ips} IPs"):
            firewall = Firewall("Firewall")
            core_switch = Switch("Core Switch")

            subnet_nodes = []
            for subnet in calc.subnets:
                with Cluster(f"{subnet.name}\n{subnet.cidr}\n{subnet.usable_ips} usable"):
                    switch = Switch("Switch")
                    server = Rack("Servers")
                    sn = Subnet(subnet.network_address)
                    switch >> server
                    subnet_nodes.append(switch)

            internet >> firewall >> core_switch
            for sn in subnet_nodes:
                core_switch >> sn

    return f"{filename}.{output_format}"


def generate_drawio_diagram(
    calculation: NetworkCalculation,
    filename: Optional[str] = None
) -> str:
    """
    Generate a draw.io compatible XML diagram

    Args:
        calculation: NetworkCalculation result
        filename: Optional custom filename (without extension)

    Returns:
        Path to the generated .drawio file
    """
    if filename is None:
        temp_dir = tempfile.mkdtemp()
        filename = os.path.join(temp_dir, f"{calculation.provider}_network")

    # Ensure directory exists
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)

    # Create draw.io XML structure
    mxfile = ET.Element("mxfile", {
        "host": "ipcalc-api",
        "modified": "",
        "agent": "IPCalc Diagram API",
        "version": "1.0"
    })

    diagram = ET.SubElement(mxfile, "diagram", {
        "name": f"{calculation.provider.upper()} Network",
        "id": "network-diagram"
    })

    # Create mxGraphModel
    graph_model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "1000",
        "dy": "800",
        "grid": "1",
        "gridSize": "10",
        "guides": "1",
        "tooltips": "1",
        "connect": "1",
        "arrows": "1",
        "fold": "1",
        "page": "1",
        "pageScale": "1",
        "pageWidth": "850",
        "pageHeight": "1100"
    })

    root = ET.SubElement(graph_model, "root")

    # Add required base cells
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    # Calculate positions
    vpc_width = 600
    vpc_height = 100 + len(calculation.subnets) * 120
    vpc_x = 100
    vpc_y = 100

    # VPC container
    vpc_cell = ET.SubElement(root, "mxCell", {
        "id": "vpc",
        "value": f"{calculation.provider.upper()}\n{calculation.vpc_cidr}\n{calculation.vpc_total_ips} IPs",
        "style": f"rounded=1;whiteSpace=wrap;html=1;fillColor={PROVIDER_COLORS.get(calculation.provider, '#666666')};fontColor=#ffffff;strokeColor=#333333;verticalAlign=top;fontSize=14;",
        "vertex": "1",
        "parent": "1"
    })
    ET.SubElement(vpc_cell, "mxGeometry", {
        "x": str(vpc_x),
        "y": str(vpc_y),
        "width": str(vpc_width),
        "height": str(vpc_height),
        "as": "geometry"
    })

    # Internet node
    internet_cell = ET.SubElement(root, "mxCell", {
        "id": "internet",
        "value": "Internet",
        "style": "ellipse;shape=cloud;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;",
        "vertex": "1",
        "parent": "1"
    })
    ET.SubElement(internet_cell, "mxGeometry", {
        "x": str(vpc_x + vpc_width // 2 - 50),
        "y": "20",
        "width": "100",
        "height": "60",
        "as": "geometry"
    })

    # Connection from internet to VPC
    edge = ET.SubElement(root, "mxCell", {
        "id": "edge-internet",
        "style": "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;",
        "edge": "1",
        "parent": "1",
        "source": "internet",
        "target": "vpc"
    })
    ET.SubElement(edge, "mxGeometry", {"relative": "1", "as": "geometry"})

    # Subnets
    subnet_y = vpc_y + 80
    subnet_width = 250
    subnet_height = 80

    for i, subnet in enumerate(calculation.subnets):
        # Alternate left/right positioning
        if i % 2 == 0:
            subnet_x = vpc_x + 30
        else:
            subnet_x = vpc_x + vpc_width - subnet_width - 30

        subnet_cell = ET.SubElement(root, "mxCell", {
            "id": f"subnet-{i}",
            "value": f"{subnet.name}\n{subnet.cidr}\n{subnet.usable_ips} usable IPs\n{subnet.availability_zone}",
            "style": "rounded=1;whiteSpace=wrap;html=1;fillColor=#e1f5fe;strokeColor=#01579b;fontSize=10;",
            "vertex": "1",
            "parent": "vpc"
        })
        ET.SubElement(subnet_cell, "mxGeometry", {
            "x": str(subnet_x - vpc_x),
            "y": str(subnet_y - vpc_y),
            "width": str(subnet_width),
            "height": str(subnet_height),
            "as": "geometry"
        })

        if i % 2 == 1:
            subnet_y += 100

    # If odd number of subnets, adjust final position
    if len(calculation.subnets) % 2 == 1:
        subnet_y += 100

    # Write the file
    tree = ET.ElementTree(mxfile)
    output_path = f"{filename}.drawio"
    tree.write(output_path, encoding="utf-8", xml_declaration=True)

    return output_path


def read_diagram_bytes(filepath: str) -> bytes:
    """Read diagram file and return bytes"""
    with open(filepath, "rb") as f:
        return f.read()


def diagram_to_base64(filepath: str) -> str:
    """Convert diagram file to base64 string"""
    return base64.b64encode(read_diagram_bytes(filepath)).decode("utf-8")
