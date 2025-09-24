#!/bin/bash

set -e

# AFTRS Supermemory Integration Setup Script
echo "🚀 AFTRS Supermemory Integration Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    print_status "Visit: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version: $(node --version) ✅"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the aftrs-supermemory directory"
    exit 1
fi

# Install dependencies
print_header "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
    print_status "Using Bun package manager"
    bun install
else
    print_status "Using npm package manager"
    npm install
fi

# Setup CLI tool
print_header "🛠️ Setting up CLI tools..."
cd cli
npm install
chmod +x supermemory-sync.ts

# Create global symlink
if command -v npm &> /dev/null; then
    npm link
    print_status "CLI tool 'supermemory-sync' is now available globally"
else
    print_warning "Could not create global symlink. Run CLI tool directly with: node supermemory-sync.js"
fi

cd ..

# Setup environment variables
print_header "🔑 Environment Configuration"
if [ ! -f ".env.local" ]; then
    print_status "Environment file .env.local already exists"
else
    print_status "Environment file .env.local created with default configuration"
fi

# Check API key
if grep -q "sm_6ZGopX4A3gvVKq8pLjwBZH_QlEUlRUFXWpxNhWJHRLBqQAzsPsyKFwsyRAObqSCysoRbnowHKgLZiqkPDIjYAfr" .env.local; then
    print_status "Default Supermemory API key is configured"
else
    print_warning "Please update your API key in .env.local"
fi

# Setup complete
print_header "✅ Setup Complete!"
echo
print_status "Available commands:"
echo "  supermemory-sync --help              # Show CLI help"
echo "  supermemory-sync --api-key <key>     # Sync with custom API key"
echo "  supermemory-sync --output-dir <dir>  # Sync to custom directory"
echo
print_status "Next steps:"
echo "  1. Verify your API key in .env.local"
echo "  2. Run: supermemory-sync --help"
echo "  3. Try: supermemory-sync --output-dir ./my-memories"
echo
print_status "Documentation: README.md"
print_status "Issues: https://github.com/aftrs-void/aftrs-supermemory/issues"
echo
print_header "🎉 Happy syncing!"
