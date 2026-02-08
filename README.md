# Withings Goals Dashboard

Lightweight Node.js dashboard for Withings measurements vs weekly and ultimate goals.

## Setup

1. **Optional**: If you want to bundle Node.js with the app, download `node-v24.13.0-linux-x64.tar.xz` from https://nodejs.org/dist/v24.13.0/ and extract it in this folder (so you have `fasto/node-v24.13.0-linux-x64/`).

2. Install dependencies:

```bash
bash install.sh
```

Or if you have system npm:
```bash
npm install
```

2. Create a `.env` file or export the environment variables:

```
WITHINGS_CLIENT_ID=your_client_id
WITHINGS_CLIENT_SECRET=your_client_secret
WITHINGS_REDIRECT_URI=http://localhost/api/withings/callback
PORT=80
HOST=0.0.0.0
```

**Note**: You can also reference `config.yaml` or `app-config.yaml` for configuration structure, but sensitive credentials must be in `.env` file.

**Note**: Port 80 requires administrator privileges on Windows. For local testing without admin rights, you can use port 3001 temporarily.

3. Update goals in `data/goals.json`.

## Run

```bash
npm run dev
```

Or directly:
```bash
bash run-dev.sh
```

The scripts automatically use the bundled Node.js if `node-v24.13.0-linux-x64/` exists in the project folder, otherwise they use system Node.js.

Open `http://localhost` (or `http://localhost:3001` if using port 3001 for testing) in your browser. Click **Connect Withings** and complete OAuth. The token is stored in `data/withings_token.json`.

## Configuration Files

The app can be configured using:
- **`.env` file** - For sensitive credentials (Client ID, Secret) and runtime settings
- **`app-config.yaml`** - For application settings and deployment configuration (optional)
- **`fasto.yml`** - Docker Compose configuration for container deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

## Docker Deployment (ZimaOS) - Recommended Method

### Prerequisites
- Docker and Docker Compose installed on ZimaOS
- Withings API credentials (Client ID and Secret)

### Step-by-Step Setup

1. **Copy all files to ZimaOS**
   - Drag and drop the entire `fasto` folder to `~/AppData/fasto` on ZimaOS

2. **Create `.env` file**
   ```bash
   cd ~/AppData/fasto
   cp .env.example .env
   ```

3. **Edit `.env` with your credentials**
   ```bash
   nano .env
   # or use your preferred editor
   ```
   
   Update these values:
               ```
               WITHINGS_CLIENT_ID=your_actual_client_id
               WITHINGS_CLIENT_SECRET=your_actual_client_secret
               WITHINGS_REDIRECT_URI=http://192.168.68.74:8888/api/withings/callback
               PORT=80
               HOST=0.0.0.0
               ```
   
   **Important**: 
   - Replace `192.168.68.74` with your actual ZimaOS IP address if different
   - If port 80 is in use, change the host port in `fasto.yml` (e.g., `8888:80`) and update the redirect URI accordingly
   - **CRITICAL**: You must update your Withings app settings at https://account.withings.com/oauth2_user/authorize2 to use the exact redirect URI: `http://192.168.68.74:8888/api/withings/callback`
   - The redirect URI in your Withings app settings must match exactly (including http://, port number, no trailing slash)

4. **Edit your goals** (optional)
   ```bash
   nano data/goals.json
   ```
   Update weekly goals and ultimate goal with your targets.

5. **Build and start the container**
   ```bash
   cd ~/AppData/fasto
   docker-compose -f fasto.yml build
   docker-compose -f fasto.yml up -d
   ```
   
   Or in one command:
   ```bash
   docker-compose -f fasto.yml up -d --build
   ```
   
   **Note**: The first time, Docker will build the image from the Dockerfile. This may take a few minutes.

6. **Check if it's running**
   ```bash
   docker-compose -f fasto.yml ps
   docker-compose -f fasto.yml logs -f
   ```

            7. **Update Withings App Settings**
               - Go to https://account.withings.com/oauth2_user/authorize2
               - Log in to your Withings developer account
               - Find your app and update the "Callback URL" to: `http://192.168.68.74/api/withings/callback`
               - Save the changes

            8. **Access the dashboard**
               - Open browser: `http://192.168.68.74` (port 80 is default for HTTP)
               - Click **Connect Withings** in the sidebar to authorize
               - Complete OAuth flow

### Useful Commands

```bash
# View logs
docker-compose -f fasto.yml logs -f

# Stop the container
docker-compose -f fasto.yml down

# Restart the container
docker-compose -f fasto.yml restart

# Rebuild after code changes
docker-compose -f fasto.yml up -d --build
```

### Notes
- The `data` folder is mounted as a volume, so your `goals.json` and `withings_token.json` persist across container restarts
- The container runs as a non-root user for security
- Health checks are configured to monitor container status

## Notes

- Measurements are normalized to kg and %.
- Dashboard data is cached for ~5 minutes to limit API calls.
