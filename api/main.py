"""
IP Calculator API with Network Diagram Generation

FastAPI application providing subnet calculation and network diagram generation
for multiple cloud providers (Azure, AWS, GCP, Oracle, Alibaba Cloud, On-Premises).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routers import calculate, diagrams

# Create FastAPI application
app = FastAPI(
    title="IP Calculator API",
    description="""
    IP subnet calculator and network diagram generator for cloud providers.

    ## Features

    * **Multi-cloud support**: Azure, AWS, GCP, Oracle Cloud, Alibaba Cloud, On-Premises
    * **Subnet calculations**: Automatic or custom subnet sizing with provider-specific constraints
    * **Network diagrams**: Generate Python code for visualizing network architecture
    * **Cloud-aware**: Respects reserved IPs and CIDR limits for each provider

    ## Diagram Generation

    The API generates executable Python code using the [diagrams](https://diagrams.mingrammer.com/) library.
    This enables you to create visual representations of your network architecture as code.

    ### Example Usage

    1. Call `/api/diagram/code` with your network configuration
    2. Save the returned Python code to a file
    3. Install dependencies: `pip install diagrams`
    4. Run the script to generate a PNG diagram

    ## Providers

    Each provider has specific constraints:
    - **Azure**: 5 reserved IPs (first 4 + last), /8 to /29 CIDR range
    - **AWS**: 5 reserved IPs, /16 to /28 CIDR range
    - **GCP**: 4 reserved IPs, /8 to /29 CIDR range
    - **Oracle**: 3 reserved IPs, /16 to /30 CIDR range
    - **Alibaba Cloud**: 4 reserved IPs, /8 to /29 CIDR range
    - **On-Premises**: 2 reserved IPs, /8 to /30 CIDR range
    """,
    version="1.0.0",
    contact={
        "name": "IP Calculator API",
        "url": "https://github.com/jvhoof/ipcalc",
    },
    license_info={
        "name": "MIT",
    },
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(calculate.router)
app.include_router(diagrams.router)


@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint - API information
    """
    return {
        "name": "IP Calculator API",
        "version": "1.0.0",
        "description": "Subnet calculator and network diagram generator for cloud providers",
        "docs": "/docs",
        "providers": ["azure", "aws", "gcp", "oracle", "alicloud", "onpremises"],
        "endpoints": {
            "calculate": "/api/calculate",
            "providers": "/api/providers",
            "diagram_code": "/api/diagram/code"
        }
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy", "service": "ipcalc-api"}


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Endpoint not found. Visit /docs for API documentation.",
            "docs_url": "/docs"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
