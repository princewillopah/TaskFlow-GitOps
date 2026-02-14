#!/bin/bash

# This script deploys the Shopsphere Ecommerce application on a Kubernetes cluster
# using AWS Secret Manager for managing sensitive information.
# Check if namespace exists

# Stop any running containers
docker-compose down

# Remove old images
docker system prune -f

# Rebuild with the corrected paths
docker-compose build --no-cache

# Start the services
docker-compose up -d

# Check logs
# docker-compose logs -f



# echo " ================================================================= "
# echo "       All resources                                               "
# echo " ================================================================= "
# kubectl get pods -n "$namespace"
# echo " if any issue: kubectl get pods -n $namespace"
# echo "kubectl port-forward -n $namespace svc/frontend 8080:80"
echo "Frontend: http://localhost"
