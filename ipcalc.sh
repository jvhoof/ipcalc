#!/usr/bin/env bash

#############################################################################
# ipcalc - IP Calculator CLI Wrapper Script
#############################################################################
# This wrapper script checks for required dependencies and provides
# installation instructions before running the ipcalc CLI tool.
#
# Required:
#   - Node.js 18 or higher
#   - npm (Node Package Manager)
#   - Project dependencies (installed via npm install)
#
# Usage:
#   ./ipcalc.sh [CLI arguments]
#   ./ipcalc.sh --help
#   ./ipcalc.sh --provider azure --cidr 10.0.0.0/16 --subnets 4
#############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Minimum required Node.js version
MIN_NODE_VERSION=18

#############################################################################
# Helper Functions
#############################################################################

print_error() {
    echo -e "${RED}ERROR:${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  $1"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

#############################################################################
# Dependency Check Functions
#############################################################################

check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo ""
        echo "Node.js is required to run the ipcalc CLI."
        echo ""
        echo "Installation instructions:"
        echo ""
        echo "  Ubuntu/Debian:"
        echo "    curl -fsSL https://deb.nodesource.com/setup_${MIN_NODE_VERSION}.x | sudo -E bash -"
        echo "    sudo apt-get install -y nodejs"
        echo ""
        echo "  RHEL/CentOS/Fedora:"
        echo "    curl -fsSL https://rpm.nodesource.com/setup_${MIN_NODE_VERSION}.x | sudo bash -"
        echo "    sudo yum install -y nodejs"
        echo ""
        echo "  macOS (using Homebrew):"
        echo "    brew install node"
        echo ""
        echo "  Using NVM (Node Version Manager - recommended):"
        echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "    nvm install ${MIN_NODE_VERSION}"
        echo "    nvm use ${MIN_NODE_VERSION}"
        echo ""
        echo "  Official website:"
        echo "    https://nodejs.org/"
        echo ""
        return 1
    fi

    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

    if [ "$node_version" -lt "$MIN_NODE_VERSION" ]; then
        print_error "Node.js version $MIN_NODE_VERSION or higher is required"
        echo ""
        echo "Current version: $(node -v)"
        echo "Required version: v${MIN_NODE_VERSION}.x or higher"
        echo ""
        echo "Please upgrade Node.js:"
        echo ""
        echo "  Using NVM (recommended):"
        echo "    nvm install ${MIN_NODE_VERSION}"
        echo "    nvm use ${MIN_NODE_VERSION}"
        echo ""
        echo "  Or download from: https://nodejs.org/"
        echo ""
        return 1
    fi

    print_success "Node.js $(node -v) is installed"
    return 0
}

check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        echo ""
        echo "npm (Node Package Manager) is required to install dependencies."
        echo ""
        echo "npm usually comes bundled with Node.js. If you have Node.js installed"
        echo "but npm is missing, try reinstalling Node.js from:"
        echo "  https://nodejs.org/"
        echo ""
        return 1
    fi

    print_success "npm $(npm -v) is installed"
    return 0
}

check_dependencies() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [ ! -d "$script_dir/node_modules" ]; then
        print_error "Project dependencies are not installed"
        echo ""
        echo "The required npm packages have not been installed."
        echo ""
        echo "To install dependencies, run:"
        echo "  cd $script_dir"
        echo "  npm install"
        echo ""
        return 1
    fi

    # Check for tsx specifically since it's required to run the CLI
    if [ ! -d "$script_dir/node_modules/tsx" ]; then
        print_warning "tsx (TypeScript runner) is not installed"
        echo ""
        echo "Installing/updating dependencies..."
        cd "$script_dir"
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            return 1
        fi
        print_success "Dependencies installed successfully"
    else
        print_success "Project dependencies are installed"
    fi

    return 0
}

check_cli_files() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [ ! -f "$script_dir/src/cli/index.ts" ]; then
        print_error "CLI source files are missing"
        echo ""
        echo "Expected file: $script_dir/src/cli/index.ts"
        echo ""
        echo "Please ensure you have the complete ipcalc project."
        echo ""
        return 1
    fi

    print_success "CLI source files found"
    return 0
}

#############################################################################
# Main Function
#############################################################################

main() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Show header
    print_header "ipcalc - IP Calculator CLI"

    # Perform all checks
    local checks_passed=true

    check_node || checks_passed=false
    check_npm || checks_passed=false
    check_dependencies || checks_passed=false
    check_cli_files || checks_passed=false

    echo ""

    # Exit if any checks failed
    if [ "$checks_passed" = false ]; then
        print_error "Dependency checks failed. Please install missing requirements."
        echo ""
        exit 1
    fi

    print_header "Running ipcalc CLI"

    # Run the CLI using npm run cli
    cd "$script_dir"

    # Check if we have arguments
    if [ $# -eq 0 ]; then
        # No arguments provided, show help
        npm run cli -- --help
    else
        # Pass all arguments to the CLI
        npm run cli -- "$@"
    fi
}

#############################################################################
# Script Execution
#############################################################################

# Run main function with all arguments
main "$@"
