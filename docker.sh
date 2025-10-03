#!/bin/bash

# Driftboard Docker Helper Script

set -e

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

# Check if .env.local exists and source it
check_env() {
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found!"
        print_status "Copying .env.example to .env.local..."
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_warning "Please edit .env.local and add your Firebase credentials before running the application."
            exit 1
        else
            print_error ".env.example not found! Please create .env.local manually."
            exit 1
        fi
    fi
    # automatically export all variables
    set -a
    source .env.local
    set +a
    print_success "Environment file found and sourced: .env.local"
}

# Show usage
show_usage() {
    echo "Driftboard Docker Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  prod       Build and run production container"
    echo "  dev        Build and run development container with hot reload"
    echo "  build      Build production image"
    echo "  clean      Clean up Docker images and containers"
    echo "  logs       Show container logs"
    echo "  stop       Stop running containers"
    echo "  restart    Restart containers"
    echo "  health     Check container health status"
    echo "  help       Show this help message"
}

# Build production image
build_prod() {
    check_env
    print_status "Building production image..."
    docker-compose build driftboard
    print_success "Production image built successfully!"
}

# Run production container
run_prod() {
    check_env
    print_status "Starting Driftboard in production mode..."
    docker-compose up -d driftboard
    print_success "Driftboard is running at http://localhost:3000"
    print_status "Run '$0 logs' to see container logs"
}

# Run development container
run_dev() {
    check_env
    print_status "Starting Driftboard in development mode..."
    docker-compose --profile dev up driftboard-dev
}

# Clean up Docker resources
clean_docker() {
    print_status "Cleaning up Docker resources..."
    docker-compose down --remove-orphans
    docker system prune -f
    print_success "Docker cleanup completed!"
}

# Show container logs
show_logs() {
    check_env
    print_status "Showing container logs..."
    docker-compose logs -f driftboard
}

# Stop containers
stop_containers() {
    check_env
    print_status "Stopping containers..."
    docker-compose down
    print_success "Containers stopped!"
}

# Restart containers
restart_containers() {
    check_env
    print_status "Restarting containers..."
    docker-compose restart
    print_success "Containers restarted!"
}

# Check health status
check_health() {
    check_env
    print_status "Checking container health..."
    docker-compose ps
}

# Main script logic
case "${1:-help}" in
    "prod")
        build_prod
        run_prod
        ;;
    "dev")
        run_dev
        ;;
    "build")
        build_prod
        ;;
    "clean")
        clean_docker
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        stop_containers
        ;;
    "restart")
        restart_containers
        ;;
    "health")
        check_health
        ;;
    "help"|*)
        show_usage
        ;;
esac