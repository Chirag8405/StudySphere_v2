#!/bin/bash

# StudySphere Production Deployment Preparation Script
# Firebase Auth + Firestore edition

set -e

echo "StudySphere Production Deployment Preparation"
echo "=============================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERR]${NC} $1"; }

# ── Check tools ──────────────────────────────────────────────────
check_dependencies() {
    print_status "Checking dependencies..."
    for cmd in node npm; do
        if ! command -v "$cmd" &>/dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done
    print_success "All dependencies available"
}

# ── Validate env ─────────────────────────────────────────────────
validate_environment() {
    print_status "Validating environment configuration..."

    if [ "$NODE_ENV" != "production" ]; then
        print_warning "NODE_ENV is not set to 'production'"
    fi

    # Firebase Admin SDK
    if [ -z "$FIREBASE_SERVICE_ACCOUNT_KEY" ] && [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        print_warning "Neither FIREBASE_SERVICE_ACCOUNT_KEY nor GOOGLE_APPLICATION_CREDENTIALS is set"
        echo "  The server needs one of these to access Firestore."
    else
        print_success "Firebase Admin credentials detected"
    fi

    # CORS
    if [ -z "$CORS_ORIGINS" ]; then
        print_warning "CORS_ORIGINS not configured — set to your production domain(s)"
    elif [[ "$CORS_ORIGINS" == *"*"* ]]; then
        print_error "CORS_ORIGINS contains wildcards (not allowed in production)"
        exit 1
    fi

    print_success "Environment validation completed"
}

# ── Install deps ─────────────────────────────────────────────────
install_dependencies() {
    print_status "Installing production dependencies..."
    npm ci --omit=dev
    print_success "Production dependencies installed"
}

# ── Security audit ───────────────────────────────────────────────
security_audit() {
    print_status "Running security audit..."
    npm audit --audit-level=high || true
    if [ -f "scripts/security-check.ts" ]; then
        npm run security:check
    fi
    print_success "Security audit completed"
}

# ── Build ────────────────────────────────────────────────────────
build_application() {
    print_status "Building application for production..."
    rm -rf dist
    npm run build:production
    print_success "Application built successfully"
}

# ── File permissions ─────────────────────────────────────────────
set_permissions() {
    print_status "Setting secure file permissions..."
    for env_file in .env .env.production .env.local; do
        if [ -f "$env_file" ]; then
            chmod 600 "$env_file"
            print_success "$env_file permissions set to 600"
        fi
    done
    print_success "File permissions configured"
}

# ── Main ─────────────────────────────────────────────────────────
main() {
    echo ""
    check_dependencies
    validate_environment
    install_dependencies
    security_audit
    build_application
    set_permissions

    echo ""
    print_success "Production preparation completed!"
    echo ""
    print_status "Next steps:"
    echo "  1. Set FIREBASE_SERVICE_ACCOUNT_KEY (or GOOGLE_APPLICATION_CREDENTIALS)"
    echo "  2. Set CORS_ORIGINS to your production domain"
    echo "  3. Deploy (Netlify: git push, Docker: docker compose up -d)"
    echo "  4. Verify /api/ping returns 200"
    echo ""
}

main "$@"
