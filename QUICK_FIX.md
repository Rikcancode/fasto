# Quick Fix for Certificate Error

## Immediate Solution: Build Locally on ZimaOS

Since pulling from GitHub Container Registry is failing due to certificate issues, build the image locally:

### Step 1: SSH into your ZimaOS device

### Step 2: Clone the repository
```bash
cd ~/AppData
git clone https://github.com/Rikcancode/fasto.git
cd fasto
```

### Step 3: Build the Docker image
```bash
docker build -f Dockerfile --target production -t fasto:latest .
```

### Step 4: Update docker-compose.yaml
Change line 7 from:
```yaml
image: ghcr.io/rikcancode/fasto:latest
```

To:
```yaml
image: fasto:latest
```

### Step 5: Install via ZimaOS UI
- Copy the updated `docker-compose.yaml` 
- Paste it into ZimaOS UI
- It will use the locally built image

---

## Alternative: Fix Docker Certificate Issue

If you want to use the pre-built image, fix Docker's certificate configuration:

```bash
# Edit Docker daemon config
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "insecure-registries": ["ghcr.1panel.live"]
}
```

Then:
```bash
sudo systemctl restart docker
```

Then try installing again in ZimaOS UI.
