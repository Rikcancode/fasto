# Building and Deploying Fasto on ZimaOS

ZimaOS can use either Docker Compose (with a pre-built image) or Docker CLI. Follow the instructions below.

**💡 Tip**: If you're having filesystem issues building on ZimaOS, you can build the image on Windows and transfer it. See `BUILD_ON_WINDOWS.md` for detailed instructions.

## Option 1: Docker Compose (Requires Pre-built Image)

### Step 1: Build the Docker Image

First, build the image using Docker CLI:

**If you get "read-only file system" error, try these solutions:**

**Option A: Build without sudo (if user is in docker group)**
```bash
cd ~/AppData/fasto
docker build -f Dockerfile --target production -t fasto:latest .
```

**Option B: Build with no cache and custom build args**
```bash
cd ~/AppData/fasto
DOCKER_BUILDKIT=0 docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

**Option C: Set Docker buildkit to use different cache location**
```bash
cd ~/AppData/fasto
export DOCKER_BUILDKIT=0
docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

**Option D: Check Docker daemon configuration**
```bash
# Check if Docker is running
sudo systemctl status docker

# Try restarting Docker
sudo systemctl restart docker

# Then try building again
docker build -f Dockerfile --target production -t fasto:latest .
```

This will build the image and tag it as `fasto:latest`.

### Step 2: Update fasto.yml for ZimaOS

The `fasto.yml` file should reference the built image. Make sure it looks like this:

```yaml
services:
  fasto:
    image: fasto:latest  # References the locally built image
    container_name: fasto
    ports:
      - "3007:80"
    # ... rest of config
```

### Step 3: Deploy via ZimaOS Docker Compose

Use ZimaOS's Docker Compose interface and point it to `fasto.yml`.

---

## Option 2: Docker CLI (Direct Container Run)

If Docker Compose doesn't work, use Docker CLI directly:

### Step 1: Build the Image

```bash
cd ~/AppData/fasto
docker build -f Dockerfile --target production -t fasto:latest .
```

### Step 2: Run the Container

```bash
docker run -d \
  --name fasto \
  --restart unless-stopped \
  -p 3007:80 \
  -e PORT=80 \
  -e NODE_ENV=production \
  -e WITHINGS_CLIENT_ID=${WITHINGS_CLIENT_ID} \
  -e WITHINGS_CLIENT_SECRET=${WITHINGS_CLIENT_SECRET} \
  -e WITHINGS_REDIRECT_URI=http://192.168.68.74:3007/api/withings/callback \
  -v $(pwd)/data:/app/data \
  --security-opt no-new-privileges:true \
  --cap-add NET_BIND_SERVICE \
  --read-only \
  --tmpfs /tmp \
  fasto:latest
```

**Note**: Make sure to set your environment variables first or replace `${WITHINGS_CLIENT_ID}` etc. with actual values.

---

## Option 3: Build Script

Create a `build-and-run.sh` script:

```bash
#!/bin/bash
cd ~/AppData/fasto

# Build the image
echo "Building Docker image..."
docker build -f Dockerfile --target production -t fasto:latest .

# Stop and remove existing container if it exists
docker stop fasto 2>/dev/null
docker rm fasto 2>/dev/null

# Run the container
echo "Starting container..."
docker run -d \
  --name fasto \
  --restart unless-stopped \
  -p 3007:80 \
  -e PORT=80 \
  -e NODE_ENV=production \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --security-opt no-new-privileges:true \
  --cap-add NET_BIND_SERVICE \
  --read-only \
  --tmpfs /tmp \
  fasto:latest

echo "Fasto is running on http://192.168.68.74:3007"
```

Make it executable and run:
```bash
chmod +x build-and-run.sh
./build-and-run.sh
```

---

## Environment Variables

Make sure your `.env` file contains:

```env
WITHINGS_CLIENT_ID=your_client_id
WITHINGS_CLIENT_SECRET=your_client_secret
WITHINGS_REDIRECT_URI=http://192.168.68.74:3007/api/withings/callback
PORT=80
HOST=0.0.0.0
```

## Verify Deployment

```bash
# Check if container is running
docker ps | grep fasto

# View logs
docker logs fasto

# Test the API
curl http://localhost:3007/api/goals
```

## Access the Dashboard

Open your browser: `http://192.168.68.74:3007`

## Update Withings App Settings

Don't forget to update your Withings app callback URL to:
`http://192.168.68.74:3007/api/withings/callback`
