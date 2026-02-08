# ZimaOS Docker App Format Guide

Based on the official ZimaOS documentation: https://www.zimaspace.com/docs/zimaos/Build-Apps

## Key Changes for ZimaOS Compatibility

### 1. File Name
- Use `docker-compose.yaml` (standard name)
- ZimaOS looks for this filename

### 2. Port Configuration
- Use `WEBUI_PORT` magic value for dynamic port allocation
- Format: `published: ${WEBUI_PORT:-3007}` (3007 is fallback)
- In `x-casaos.port_map`: `${WEBUI_PORT:-3007}`

### 3. Volume Paths
- Use ZimaOS standard paths: `/DATA/AppData/fasto/data`
- Not relative paths like `./data`

### 4. x-casaos Metadata Field

Required fields:
- `architectures`: List of supported architectures (amd64, arm64, arm)
- `main`: Name of main service (must match service name)
- `author`: App author
- `category`: App category (Health, Backup, Media, etc.)
- `description.en_us`: Detailed description (at least English)
- `developer`: Developer name
- `icon`: URL to icon (SVG preferred, PNG acceptable)
- `tagline.en_us`: One-line description
- `thumbnail`: URL to thumbnail/screenshot
- `title.en_us`: App name
- `tips.before_install.en_us`: Pre-installation notes (supports markdown)
- `index`: Web UI index path (usually `/`)
- `port_map`: Port mapping (use `${WEBUI_PORT:-3007}`)

### 5. Image Requirements

**For ZimaOS Docker Compose UI:**
- The image must be pre-built and available
- Either:
  - Build locally: `docker build -t fasto:latest .`
  - Push to Docker Hub: `docker push yourusername/fasto:latest`
  - Use the image reference in `docker-compose.yaml`

### 6. Environment Variables

- Use `${WEBUI_PORT}` for dynamic port allocation
- Use `${WITHINGS_CLIENT_ID}` etc. for user-configurable values
- Set defaults with `:-` syntax: `${VAR:-default}`

### 7. Icon and Screenshot

- **Icon**: SVG preferred, PNG acceptable
- **Thumbnail**: Screenshot of the app
- Host on GitHub/CDN and reference in `x-casaos` fields

## Current Configuration

The `docker-compose.yaml` file has been updated to match ZimaOS format:

✅ Uses `docker-compose.yaml` filename
✅ Uses `WEBUI_PORT` for dynamic port allocation
✅ Uses ZimaOS standard volume paths (`/DATA/AppData/fasto/data`)
✅ Includes complete `x-casaos` metadata
✅ Supports multiple architectures
✅ Includes pre-installation tips

## Deployment Steps

1. **Build the image** (on ZimaOS or transfer from Windows):
   ```bash
   docker build -f Dockerfile --target production -t fasto:latest .
   ```

2. **Use ZimaOS Docker Compose UI**:
   - Point to `docker-compose.yaml`
   - ZimaOS will handle port allocation automatically
   - Configure environment variables through UI

3. **Or use Docker CLI**:
   ```bash
   docker-compose up -d
   ```

## Notes

- The `WEBUI_PORT` will be automatically assigned by ZimaOS
- Update the Withings redirect URI to use the assigned port
- Icon and thumbnail URLs need to be hosted (GitHub, CDN, etc.)
- The `x-casaos` field is required for ZimaOS app store compatibility
