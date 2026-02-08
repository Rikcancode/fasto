# ZimaOS Deployment Guide

This guide will help you deploy Fasto to your ZimaOS device.

**📖 Official ZimaOS Documentation**: https://www.zimaspace.com/docs/zimaos/Build-Apps

The configuration has been updated to match ZimaOS Docker App format with proper `x-casaos` metadata and `WEBUI_PORT` support.

## Prerequisites

- ZimaOS device accessible at `http://192.168.68.74`
- Docker and Docker Compose installed on ZimaOS
- Withings API credentials (Client ID and Secret)
- Access to Withings Developer Portal

## Step-by-Step Deployment

### 1. Transfer Files to ZimaOS

Copy the entire `fasto` folder to your ZimaOS device:
- Destination: `~/AppData/fasto` (or your preferred location)

You can use:
- SMB/CIFS file sharing
- SFTP/SCP
- Direct file transfer via ZimaOS web interface

### 2. Create Environment File

```bash
cd ~/AppData/fasto
cp .env.example .env
```

### 3. Configure Environment Variables

You can configure the app using either `.env` file or `app-config.yaml`. The `.env` file takes precedence.

**Option A: Using .env file (Recommended)**

Edit the `.env` file with your credentials:

```bash
nano .env
```

Update these values:

```env
WITHINGS_CLIENT_ID=your_actual_client_id
WITHINGS_CLIENT_SECRET=your_actual_client_secret
WITHINGS_REDIRECT_URI=http://192.168.68.74:8888/api/withings/callback
PORT=80
HOST=0.0.0.0
```

**Important Notes:**
- Replace `192.168.68.74` with your actual ZimaOS IP address if different
- If port 80 is already in use, change the host port in `fasto.yml` (e.g., `8888:80`) and update the redirect URI accordingly
- The redirect URI must match exactly (including `http://`, port number, no trailing slash)
- Container port remains 80 internally; only the host port mapping changes

### 4. Update Withings App Settings

**CRITICAL STEP**: You must configure your Withings app to use the correct redirect URI.

1. Go to https://account.withings.com/oauth2_user/authorize2
2. Log in to your Withings developer account
3. Find your app in the list
4. Click on your app to edit it
5. Update the "Callback URL" field to: `http://192.168.68.74/api/withings/callback`
6. Save the changes

**The redirect URI must match exactly** - any mismatch will cause OAuth to fail.

**Option B: Using app-config.yaml**

Alternatively, you can edit `app-config.yaml` to configure deployment settings:
```yaml
deployment:
  platform: "ZimaOS"
  ip_address: "192.168.68.74"
  port: 80
```

Note: Sensitive credentials (Client ID and Secret) should still be set in `.env` file, not in YAML.

### 5. Build the Docker Image

**Important**: ZimaOS Docker Compose requires a pre-built image. 

**Option A: Build on ZimaOS** (Recommended - see `ZIMAOS_BUILD_SOLUTIONS.md` for troubleshooting):

```bash
cd ~/AppData/fasto
```

**If you get "read-only file system" error:**

Try building with BuildKit disabled and no cache:
```bash
DOCKER_BUILDKIT=0 docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

Or without sudo (if your user is in docker group):
```bash
docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

Or use the build script:
```bash
chmod +x build-and-run.sh
./build-and-run.sh
```

**Option B: Build on Windows and Transfer** (Requires virtualization enabled in BIOS):

**Note**: If you get "Virtualization support not detected" error, you cannot use this option. Enable virtualization in BIOS first, or use Option A.

See `BUILD_ON_WINDOWS.md` for complete instructions if virtualization is available.

This builds/imports the image and tags it as `fasto:latest`.

### 6. Start the Container

**Option A: Using Docker Compose (ZimaOS UI) - Recommended**

After building the image, use ZimaOS's Docker Compose interface:
1. Point it to `docker-compose.yaml` (ZimaOS looks for this standard filename)
2. ZimaOS will automatically assign a port using `WEBUI_PORT`
3. Configure environment variables through the UI
4. The `x-casaos` metadata ensures proper integration with ZimaOS

**Note**: The `docker-compose.yaml` file uses ZimaOS standard paths (`/DATA/AppData/fasto/data`) and `WEBUI_PORT` for dynamic port allocation.

**Option B: Using Docker CLI**

```bash
# Make sure .env file exists with your credentials
docker run -d \
  --name fasto \
  --restart unless-stopped \
  -p 3007:80 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --security-opt no-new-privileges:true \
  --cap-add NET_BIND_SERVICE \
  --read-only \
  --tmpfs /tmp \
  fasto:latest
```

**Option C: Using Build Script**

```bash
chmod +x build-and-run.sh
./build-and-run.sh
```

See `BUILD_AND_DEPLOY.md` for detailed instructions.

### 7. Verify Deployment

Check if the container is running:

```bash
docker-compose -f fasto.yml ps
```

View logs:

```bash
docker-compose -f fasto.yml logs -f
```

### 8. Access the Dashboard

1. Open your browser and navigate to: `http://192.168.68.74:8888`
   (Use the port number specified in your `fasto.yml` ports mapping)
2. You should see the Fasto dashboard
3. Click **Connect Withings** in the sidebar
4. Complete the OAuth authorization flow
5. You'll be redirected back to the dashboard

### 8. Configure Goals (Optional)

After connecting Withings, you can set up your goals:
1. Click **Plan Settings** in the sidebar
2. Set your current weight and body fat %
3. Set your target weight, body fat %, and target date
4. Generate bi-weekly milestones or add custom milestones
5. Click **Save Goals**

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f fasto.yml logs

# Check if port 80 is already in use
netstat -tuln | grep :80
```

### OAuth redirect error

- Verify the redirect URI in `.env` matches your Withings app settings exactly
- Check that the redirect URI in Withings app settings is: `http://192.168.68.74/api/withings/callback`
- Ensure there are no trailing slashes or extra characters

### Can't access dashboard

- Verify the container is running: `docker-compose -f fasto.yml ps`
- Check if port 80 is accessible: `curl http://localhost/api/goals`
- Verify firewall settings on ZimaOS

### Data persistence

Goals and tokens are stored in `./data/` directory, which is mounted as a volume. This ensures data persists across container restarts.

## Updating the Application

To update the application:

```bash
cd ~/AppData/fasto
# Pull latest changes or copy updated files
docker-compose -f fasto.yml down
docker-compose -f fasto.yml up -d --build
```

## Stopping the Application

```bash
cd ~/AppData/fasto
docker-compose -f fasto.yml down
```

## Uninstalling

```bash
cd ~/AppData/fasto
docker-compose -f fasto.yml down -v
# Optionally remove the directory
rm -rf ~/AppData/fasto
```
