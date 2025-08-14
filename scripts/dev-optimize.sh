#!/bin/bash

# Next.js Development Optimization Script
# This script helps optimize the development environment

echo "🚀 Next.js Development Optimizer"
echo "================================"

# Function to clear cache
clear_cache() {
    echo "🧹 Clearing Next.js cache..."
    rm -rf .next
    echo "✅ Cache cleared!"
}

# Function to clear node modules
clear_modules() {
    echo "📦 Clearing node modules..."
    rm -rf node_modules package-lock.json
    npm install
    echo "✅ Node modules reinstalled!"
}

# Function to start optimized development
start_dev() {
    echo "⚡ Starting optimized development server..."
    npm run dev:fast
}

# Function to check system resources
check_system() {
    echo "💻 System Resources:"
    echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "Disk: $(df -h . | tail -1 | awk '{print $5}')"
}

# Function to optimize environment
optimize_env() {
    echo "🔧 Optimizing environment..."

    # Create .env.local if it doesn't exist
    if [ ! -f .env.local ]; then
        cat > .env.local << EOF
# Development Performance Optimizations
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=development
NEXT_TURBO=1
NODE_OPTIONS="--max-old-space-size=4096"
EOF
        echo "✅ Created .env.local with optimizations"
    else
        echo "ℹ️  .env.local already exists"
    fi
}

# Main menu
case "${1:-}" in
    "clear")
        clear_cache
        ;;
    "reset")
        clear_cache
        clear_modules
        ;;
    "start")
        start_dev
        ;;
    "check")
        check_system
        ;;
    "optimize")
        optimize_env
        ;;
    *)
        echo "Usage: $0 [clear|reset|start|check|optimize]"
        echo ""
        echo "Commands:"
        echo "  clear   - Clear Next.js cache"
        echo "  reset   - Clear cache and reinstall modules"
        echo "  start   - Start optimized development server"
        echo "  check   - Check system resources"
        echo "  optimize - Optimize environment variables"
        echo ""
        echo "Quick start:"
        echo "  $0 optimize && $0 start"
        ;;
esac