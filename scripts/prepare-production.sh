#!/bin/bash

# StudySphere Production Deployment Preparation Script
# This script ensures your application is ready for secure production deployment

set -e  # Exit on any error

echo "🚀 StudySphere Production Deployment Preparation"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required commands are available
check_dependencies() {
    print_status "Checking dependencies..."
    
    commands=("node" "npm" "openssl")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    print_success "All dependencies are available"
}

# Generate secure JWT secret if not provided
generate_jwt_secret() {
    if [ -z "$JWT_SECRET" ]; then
        print_status "Generating secure JWT secret..."
        JWT_SECRET=$(openssl rand -hex 64)
        print_success "JWT secret generated (64 bytes)"
        echo "Add this to your production environment:"
        echo "JWT_SECRET=$JWT_SECRET"
        echo ""
    else
        print_success "JWT secret already configured"
    fi
}

# Validate environment configuration
validate_environment() {
    print_status "Validating environment configuration..."
    
    # Check NODE_ENV
    if [ "$NODE_ENV" != "production" ]; then
        print_warning "NODE_ENV is not set to 'production'"
        echo "Set NODE_ENV=production for production deployment"
    fi
    
    # Check JWT secret strength
    if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 64 ]; then
        print_error "JWT_SECRET is too short (minimum 64 characters required)"
        exit 1
    fi
    
    # Check CORS origins
    if [ -z "$CORS_ORIGINS" ]; then
        print_warning "CORS_ORIGINS not configured"
        echo "Configure CORS_ORIGINS with your production domains"
    elif [[ "$CORS_ORIGINS" == *"*"* ]]; then
        print_error "CORS_ORIGINS contains wildcards (not allowed in production)"
        exit 1
    fi
    
    print_success "Environment validation completed"
}

# Install production dependencies
install_dependencies() {
    print_status "Installing production dependencies..."
    
    # Clean install
    if [ -d "node_modules" ]; then
        rm -rf node_modules
    fi
    
    # Install only production dependencies
    npm ci --only=production
    
    print_success "Production dependencies installed"
}

# Run security audit
security_audit() {
    print_status "Running security audit..."
    
    # Run npm audit
    npm audit --audit-level=high
    
    # Run custom security checks
    if [ -f "scripts/security-check.ts" ]; then
        npm run security:check
    fi
    
    print_success "Security audit completed"
}

# Build application
build_application() {
    print_status "Building application for production..."
    
    # Clean previous builds
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # Build for production
    npm run build:production
    
    print_success "Application built successfully"
}

# Set secure file permissions
set_permissions() {
    print_status "Setting secure file permissions..."
    
    # Database file (if exists)
    if [ -f "studysphere.db" ]; then
        chmod 600 studysphere.db
        print_success "Database file permissions set to 600"
    fi
    
    # Environment files
    for env_file in .env .env.production .env.local; do
        if [ -f "$env_file" ]; then
            chmod 600 "$env_file"
            print_success "$env_file permissions set to 600"
        fi
    done
    
    # Application files
    find . -name "*.js" -type f -exec chmod 644 {} \;
    find . -name "*.json" -type f -exec chmod 644 {} \;
    
    print_success "File permissions configured"
}

# Generate deployment checklist
generate_checklist() {
    print_status "Generating deployment checklist..."
    
    cat > production-checklist.md << EOF
# 🚀 StudySphere Production Deployment Checklist

Generated on: $(date)

## Environment Configuration
- [ ] NODE_ENV=production
- [ ] JWT_SECRET is set (64+ characters)
- [ ] CORS_ORIGINS configured with actual domains
- [ ] BCRYPT_ROUNDS set to 12 or higher
- [ ] Database path configured securely

## Security Configuration
- [ ] HTTPS/TLS enabled
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive data

## Infrastructure
- [ ] Firewall configured (ports 80, 443 only)
- [ ] Database file secured (permissions 600)
- [ ] Application runs as non-root user
- [ ] Log rotation configured
- [ ] Monitoring and alerting set up

## Testing
- [ ] Security audit passed
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Backup and recovery tested

## Post-Deployment
- [ ] Health checks passing
- [ ] Logs reviewed for errors
- [ ] Performance monitoring active
- [ ] Security monitoring active

## Commands for deployment:

\`\`\`bash
# Install dependencies
npm ci --only=production

# Build application
npm run build:production

# Start application
npm run start:production
\`\`\`

## Environment Variables Required:

\`\`\`env
NODE_ENV=production
JWT_SECRET=your-64-character-secret
CORS_ORIGINS=https://yourdomain.com
BCRYPT_ROUNDS=12
PORT=8080
\`\`\`

EOF

    print_success "Deployment checklist generated: production-checklist.md"
}

# Create systemd service file
create_service_file() {
    print_status "Creating systemd service file..."
    
    cat > studysphere.service << EOF
[Unit]
Description=StudySphere Student Dashboard
After=network.target

[Service]
Type=simple
User=studysphere
WorkingDirectory=/opt/studysphere
ExecStart=/usr/bin/node dist/server/node-build-production.mjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/studysphere/.env.production

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/studysphere

[Install]
WantedBy=multi-user.target
EOF

    print_success "Systemd service file created: studysphere.service"
    echo "Copy this file to /etc/systemd/system/ on your server"
}

# Main execution
main() {
    echo ""
    print_status "Starting production preparation..."
    echo ""
    
    check_dependencies
    generate_jwt_secret
    validate_environment
    install_dependencies
    security_audit
    build_application
    set_permissions
    generate_checklist
    create_service_file
    
    echo ""
    print_success "🎉 Production preparation completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Review production-checklist.md"
    echo "2. Configure your production environment variables"
    echo "3. Deploy to your production server"
    echo "4. Configure reverse proxy (Nginx/Apache)"
    echo "5. Set up monitoring and backups"
    echo ""
    print_warning "⚠️  Remember to:"
    echo "- Never commit .env files to version control"
    echo "- Rotate JWT secrets regularly"
    echo "- Monitor security logs"
    echo "- Keep dependencies updated"
}

# Run main function
main "$@"
