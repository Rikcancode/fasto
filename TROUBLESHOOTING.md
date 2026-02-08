# Troubleshooting Docker Image Pull Issues

## Certificate Error: "certificate signed by unknown authority"

If you see this error when pulling the Docker image:
```
Error response from daemon: Get "https://ghcr.1panel.live/v2/": tls: failed to verify certificate
```

### Solution 1: Configure Docker to Use Insecure Registry (Quick Fix)

On your ZimaOS device, edit Docker daemon configuration:

```bash
# Edit Docker daemon config
sudo nano /etc/docker/daemon.json
```

Add or update with:
```json
{
  "insecure-registries": ["ghcr.1panel.live"],
  "registry-mirrors": []
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

**Note**: This makes the registry insecure - only use if you trust the proxy.

### Solution 2: Update CA Certificates

```bash
# Update CA certificates
sudo apt-get update
sudo apt-get install -y ca-certificates
sudo update-ca-certificates

# Restart Docker
sudo systemctl restart docker
```

### Solution 3: Use Docker Hub Instead (Recommended)

If certificate issues persist, use Docker Hub:

1. **Push image to Docker Hub** (from GitHub Actions or manually)
2. **Update docker-compose.yaml** to use:
   ```yaml
   image: yourusername/fasto:latest
   ```

### Solution 4: Build Locally on ZimaOS

If pulling fails, build the image directly on ZimaOS:

```bash
# Clone the repository
cd ~/AppData
git clone https://github.com/Rikcancode/fasto.git
cd fasto

# Build the image
docker build -f Dockerfile --target production -t fasto:latest .

# Update docker-compose.yaml to use local image
# Change: image: ghcr.io/rikcancode/fasto:latest
# To:     image: fasto:latest
```

### Solution 5: Disable Proxy/Mirror

If ZimaOS is using a proxy that's causing issues:

```bash
# Check Docker daemon config
sudo cat /etc/docker/daemon.json

# Remove or comment out registry-mirrors
sudo nano /etc/docker/daemon.json
# Remove lines like: "registry-mirrors": ["https://ghcr.1panel.live"]

# Restart Docker
sudo systemctl restart docker
```

### Solution 6: Pull Directly from GitHub Container Registry

Try pulling directly without proxy:

```bash
# Pull directly from GitHub Container Registry
docker pull ghcr.io/rikcancode/fasto:latest

# If that works, the issue is with the proxy configuration
```

## Quick Fix Summary

**Fastest solution**: Build locally on ZimaOS (Solution 4) - no certificate issues, no proxy problems.

**Best long-term**: Fix Docker daemon configuration (Solution 1 or 5) to handle certificates properly.
