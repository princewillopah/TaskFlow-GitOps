#!/bin/bash
set -e

REGISTRY_NAME="princewillopah2"
backend_image="$REGISTRY_NAME/taskflow-app_backend"
frontend_image="$REGISTRY_NAME/taskflow-app_frontend"
image_tag="dev_1.1.6"
current_dir=$(pwd)
echo $current_dir
# # curl -X POST \
# #   https://hub.docker.com/v2/repositories/ \
# #   -H 'Content-Type: application/json' \
# #   -H "Authorization: Bearer $(echo $DOCKER_PASSWORD2 | docker login -u $DOCKER_USERNAME2 --password-stdin | grep -o 'token=.*')" \
# #   -d '{"name": "taskflow-app/backend", "description": "My repo"}'


# Login to DockerHub
echo "$DOCKER_PASSWORD2" | docker login -u "$DOCKER_USERNAME2" --password-stdin

echo " ================================================================= "
echo " Build backend image "
echo " ================================================================= "
docker build -t $backend_image:$image_tag $current_dir/backend

echo " ================================================================= "
echo " Push Backend image to Dockerhub "
echo " ================================================================= "
docker push $backend_image:$image_tag

echo ""
echo " ================================================================= "
echo " Build frontend image "
echo " ================================================================= "
docker build -t $frontend_image:$image_tag $current_dir/frontend

echo " ================================================================= "
echo " Push Frontend image to Dockerhub "
echo " ================================================================= "
docker push $frontend_image:$image_tag

echo ""
echo "copy the following to kubernetes yaml files"
echo "$frontend_image:$image_tag"
echo "$backend_image:$image_tag"