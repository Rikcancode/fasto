# Installing Fasto on ZimaOS via YAML

Yes! You can absolutely use the YAML file to install Fasto directly in ZimaOS. Here's how:

## Quick Installation Steps

### Option 1: Paste YAML Directly in ZimaOS UI

1. **Open ZimaOS App Management**
   - Go to your ZimaOS web interface
   - Navigate to Apps or Docker Compose section
   - Look for "Install from YAML" or "Paste Compose File" option

2. **Copy the YAML content**
   - Open `docker-compose.yaml` from this repository
   - Copy the entire file contents (or use the clean version below)

3. **Paste and Install**
   - Paste the YAML into ZimaOS
   - ZimaOS will automatically:
     - Pull the Docker image from GitHub Container Registry
     - Set up volumes and ports
     - Configure environment variables (you'll be prompted)

4. **Configure Environment Variables**
   After installation, you'll need to set:
   - `WITHINGS_CLIENT_ID` - Your Withings API Client ID
   - `WITHINGS_CLIENT_SECRET` - Your Withings API Secret
   - `WITHINGS_REDIRECT_URI` - Will be auto-set based on assigned port

## Clean YAML for Pasting

Here's the ready-to-paste version (without comments):

```yaml
version: '3.8'

services:
  fasto:
    image: ghcr.io/rikcancode/fasto:latest
    container_name: fasto
    ports:
      - target: 80
        published: ${WEBUI_PORT:-3007}
        protocol: tcp
    environment:
      - PORT=80
      - NODE_ENV=production
      - WITHINGS_CLIENT_ID=${WITHINGS_CLIENT_ID}
      - WITHINGS_CLIENT_SECRET=${WITHINGS_CLIENT_SECRET}
      - WITHINGS_REDIRECT_URI=${WITHINGS_REDIRECT_URI:-http://192.168.68.74:${WEBUI_PORT:-3007}/api/withings/callback}
    volumes:
      - type: bind
        source: /DATA/AppData/fasto/data
        target: /app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost/api/goals', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    security_opt:
      - no-new-privileges:true
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp

x-casaos:
  architectures:
    - amd64
    - arm64
    - arm
  main: fasto
  author: Fasto Team
  category: Health
  description:
    en_us: Fasto is a weight loss journey tracking dashboard with Withings integration. Track your weight and body fat percentage against bi-weekly milestones and ultimate goals with beautiful charts and visualizations.
  developer: Fasto
  icon: https://raw.githubusercontent.com/Rikcancode/fasto/master/public/icon.png
  tagline:
    en_us: Track your weight loss journey with milestones and goals
  thumbnail: https://raw.githubusercontent.com/Rikcancode/fasto/master/public/icon.png
  title:
    en_us: Fasto
  tips:
    before_install:
      en_us: |
        **Before Installation:**
        
        1. You need a Withings account and API credentials
        2. Get your Client ID and Secret from: https://account.withings.com/oauth2_user/authorize2
        3. Set up your Withings app callback URL to: `http://YOUR_ZIMAOS_IP:${WEBUI_PORT}/api/withings/callback`
        4. After installation, configure your Withings credentials in the app settings
        
        **Default Configuration:**
        - Web UI Port: Automatically assigned by ZimaOS
        - Data Storage: `/DATA/AppData/fasto/data`
  index: /
  port_map: ${WEBUI_PORT:-3007}
```

## Option 2: Install from GitHub URL

Some ZimaOS versions allow installing directly from a GitHub URL:

1. In ZimaOS App Management, look for "Install from URL" or "GitHub" option
2. Enter: `https://github.com/Rikcancode/fasto`
3. ZimaOS will automatically find and use `docker-compose.yaml`

## Option 3: Download and Install

1. **Download the file**
   ```bash
   # On ZimaOS, via SSH or terminal
   cd ~/AppData
   wget https://raw.githubusercontent.com/Rikcancode/fasto/master/docker-compose.yaml
   ```

2. **Install via ZimaOS UI**
   - Point ZimaOS to the downloaded `docker-compose.yaml` file
   - Or use docker-compose CLI: `docker-compose up -d`

## Post-Installation Configuration

### 1. Get Your Withings API Credentials

1. Go to: https://account.withings.com/oauth2_user/authorize2
2. Create a new application
3. Set the callback URL to: `http://YOUR_ZIMAOS_IP:ASSIGNED_PORT/api/withings/callback`
   - Replace `YOUR_ZIMAOS_IP` with your ZimaOS device IP
   - Replace `ASSIGNED_PORT` with the port ZimaOS assigned (check in ZimaOS UI)

### 2. Configure Environment Variables

In ZimaOS app settings, set:
- `WITHINGS_CLIENT_ID` = Your Client ID
- `WITHINGS_CLIENT_SECRET` = Your Client Secret
- `WITHINGS_REDIRECT_URI` = `http://YOUR_ZIMAOS_IP:ASSIGNED_PORT/api/withings/callback`

### 3. Access the App

- ZimaOS will show you the app URL in the Apps list
- Usually: `http://YOUR_ZIMAOS_IP:ASSIGNED_PORT`
- Click to open Fasto dashboard

## Troubleshooting

### Image Not Found Error

If you get an error that the image `ghcr.io/rikcancode/fasto:latest` is not found:

1. **Wait for GitHub Actions**: The image is built automatically when code is pushed. Check: https://github.com/Rikcancode/fasto/actions
2. **Make image public**: Go to https://github.com/Rikcancode/fasto/pkgs/container/fasto and make it public
3. **Pull manually**: 
   ```bash
   docker pull ghcr.io/rikcancode/fasto:latest
   ```

### Port Already in Use

ZimaOS will automatically assign a different port if 3007 is taken. Check the assigned port in the ZimaOS UI.

### Environment Variables Not Working

- Make sure you're setting them in ZimaOS app settings, not editing the YAML directly
- Restart the container after changing environment variables

## What ZimaOS Does Automatically

When you paste the YAML:
- ✅ Pulls the Docker image
- ✅ Creates necessary directories (`/DATA/AppData/fasto/data`)
- ✅ Assigns a port (using `WEBUI_PORT` variable)
- ✅ Sets up the container with proper permissions
- ✅ Configures health checks
- ✅ Enables auto-restart

You just need to configure your Withings credentials!
