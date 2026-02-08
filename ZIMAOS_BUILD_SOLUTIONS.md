# Building on ZimaOS - Solutions for Filesystem Issues

Since Docker Desktop can't run on Windows (virtualization disabled), we need to build directly on ZimaOS. Here are solutions for the read-only filesystem issue.

## Solution 1: Build in User's Home Directory

Docker might be trying to write to `/root/.docker` which is read-only. Build in your user's home directory:

```bash
cd ~/AppData/fasto

# Set Docker to use a writable location for build cache
export DOCKER_BUILDKIT=0
export BUILDKIT_STEP_LOG_MAX_SIZE=0
export BUILDKIT_STEP_LOG_MAX_SPEED=0

# Build without cache
docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

## Solution 2: Use Docker Buildx with Different Cache Location

```bash
cd ~/AppData/fasto

# Create a writable cache directory
mkdir -p ~/.docker/buildx-cache

# Build with custom cache location
DOCKER_BUILDKIT=0 docker build \
  --no-cache \
  --progress=plain \
  -f Dockerfile \
  --target production \
  -t fasto:latest .
```

## Solution 3: Build Without Docker BuildKit

```bash
cd ~/AppData/fasto

# Completely disable BuildKit
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

# Build with legacy builder
docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

## Solution 4: Check Docker Daemon Configuration

The Docker daemon might be configured to use a read-only location. Check and fix:

```bash
# Check Docker info
docker info | grep -i "docker root dir"

# Check if you can write to Docker's directory
sudo touch /var/lib/docker/test 2>&1

# If that fails, check Docker daemon config
sudo cat /etc/docker/daemon.json 2>/dev/null || echo "No daemon.json found"
```

## Solution 5: Use ZimaOS Docker Compose UI

ZimaOS might have a Docker Compose interface that handles builds differently:

1. **Check ZimaOS App Management**
   - Look for Docker/Container management in ZimaOS UI
   - It might have a "Build from Dockerfile" option
   - Or it might handle the build automatically

2. **Try Using docker-compose.yml Instead**
   - Rename `fasto.yml` to `docker-compose.yml`
   - Some UIs look for the standard filename
   - The UI might handle building automatically

## Solution 6: Modify Dockerfile to Avoid Cache Issues

Create a simplified build process:

```bash
cd ~/AppData/fasto

# Build with minimal layers and no cache
docker build \
  --no-cache \
  --progress=plain \
  --build-arg BUILDKIT_INLINE_CACHE=0 \
  -f Dockerfile \
  --target production \
  -t fasto:latest .
```

## Solution 7: Check Docker Storage Driver

```bash
# Check current storage driver
docker info | grep "Storage Driver"

# If using overlay2, try switching (requires Docker restart)
# Edit /etc/docker/daemon.json:
# {
#   "storage-driver": "vfs"
# }
# Then: sudo systemctl restart docker
```

## Solution 8: Build as Non-Root User

If you're using sudo, try without:

```bash
# Check if your user is in docker group
groups | grep docker

# If not, add yourself (requires sudo initially)
sudo usermod -aG docker $USER
# Log out and back in, then:
docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

## Solution 9: Use Podman Instead of Docker

If Docker has persistent issues, ZimaOS might support Podman:

```bash
# Check if podman is available
which podman || echo "Podman not installed"

# If available, build with podman
podman build -f Dockerfile --target production -t fasto:latest .

# Save the image
podman save fasto:latest -o fasto-image.tar

# Load into Docker (if needed)
docker load -i fasto-image.tar
```

## Solution 10: Manual Multi-Stage Build

Build each stage manually to avoid cache issues:

```bash
cd ~/AppData/fasto

# Build base stage
docker build --target base -t fasto:base .

# Build deps stage  
docker build --target deps -t fasto:deps .

# Build production stage
docker build --target production -t fasto:latest .
```

## Recommended Approach

Try these in order:

1. **First**: Solution 1 (build in home directory with DOCKER_BUILDKIT=0)
2. **If that fails**: Solution 8 (build as non-root user)
3. **If still failing**: Solution 5 (use ZimaOS UI if available)
4. **Last resort**: Solution 9 (use Podman if available)

## Check ZimaOS Documentation

ZimaOS might have specific Docker build instructions. Check:
- ZimaOS documentation/wiki
- ZimaOS community forums
- ZimaOS GitHub issues

## Alternative: Use a Cloud Build Service

If all else fails, you could:
1. Push code to GitHub
2. Use GitHub Actions to build the image
3. Push to Docker Hub
4. Pull on ZimaOS

But this requires GitHub/Docker Hub accounts.
