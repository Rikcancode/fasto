#!/bin/bash
# Build and Run Fasto on ZimaOS

cd ~/AppData/fasto || cd "$(dirname "$0")"

echo "Building Docker image..."
# Disable buildkit to avoid cache issues on read-only filesystems
export DOCKER_BUILDKIT=0
docker build --no-cache -f Dockerfile --target production -t fasto:latest .

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Stop and remove existing container if it exists
echo "Stopping existing container (if any)..."
docker stop fasto 2>/dev/null
docker rm fasto 2>/dev/null

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the container
echo "Starting container..."
docker run -d \
  --name fasto \
  --restart unless-stopped \
  -p 3007:80 \
  -e PORT=80 \
  -e NODE_ENV=production \
  -e WITHINGS_CLIENT_ID="${WITHINGS_CLIENT_ID}" \
  -e WITHINGS_CLIENT_SECRET="${WITHINGS_CLIENT_SECRET}" \
  -e WITHINGS_REDIRECT_URI="${WITHINGS_REDIRECT_URI:-http://192.168.68.74:3007/api/withings/callback}" \
  -v "$(pwd)/data:/app/data" \
  --security-opt no-new-privileges:true \
  --cap-add NET_BIND_SERVICE \
  --read-only \
  --tmpfs /tmp \
  fasto:latest

if [ $? -eq 0 ]; then
    echo "✓ Fasto is running on http://192.168.68.74:3007"
    echo "View logs with: docker logs -f fasto"
else
    echo "✗ Failed to start container"
    exit 1
fi
