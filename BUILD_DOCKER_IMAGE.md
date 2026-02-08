# Building Docker Image for ZimaOS

Yes! You can create a Docker image for ZimaOS from the GitHub repository. There are two ways to do this:

## Option 1: Automatic Build via GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow that automatically builds and pushes Docker images to GitHub Container Registry (ghcr.io) whenever you push to the repository.

### How it works:

1. **Automatic builds**: Every push to `master` or `main` branch triggers an automatic build
2. **Multi-architecture support**: Builds for `linux/amd64`, `linux/arm64`, and `linux/arm/v7`
3. **Image location**: Images are pushed to `ghcr.io/rikcancode/fasto:latest`

### Using the pre-built image:

The `docker-compose.yaml` file is already configured to use the GitHub Container Registry image:

```yaml
image: ghcr.io/rikcancode/fasto:latest
```

### Pulling the image on ZimaOS:

```bash
# Login to GitHub Container Registry (optional, for private repos)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull the image
docker pull ghcr.io/rikcancode/fasto:latest

# Or use docker-compose which will pull automatically
docker-compose up -d
```

### Making the image public:

If your repository is public, the image will be public automatically. If it's private, you need to:

1. Go to your GitHub repository
2. Click on "Packages" (right sidebar)
3. Click on the `fasto` package
4. Go to "Package settings"
5. Change visibility to "Public"

## Option 2: Build Locally on ZimaOS

If you prefer to build the image directly on your ZimaOS device:

### Step 1: Clone the repository

```bash
cd ~/AppData
git clone https://github.com/Rikcancode/fasto.git
cd fasto
```

### Step 2: Build the Docker image

```bash
# Disable BuildKit to avoid filesystem issues
export DOCKER_BUILDKIT=0

# Build the image
docker build --no-cache -f Dockerfile --target production -t fasto:latest .
```

### Step 3: Update docker-compose.yaml

Change the image reference back to local:

```yaml
image: fasto:latest
```

### Step 4: Run with docker-compose

```bash
docker-compose up -d
```

## Option 3: Build on Windows and Transfer

If you have Docker Desktop working on Windows:

### Step 1: Build on Windows

```bash
cd "e:\Cursor projects\Fasto"
docker build -f Dockerfile --target production -t fasto:latest .
```

### Step 2: Export the image

```bash
docker save fasto:latest -o fasto-image.tar
```

### Step 3: Transfer to ZimaOS

Use SCP, SFTP, or a USB drive to transfer `fasto-image.tar` to your ZimaOS device.

### Step 4: Load on ZimaOS

```bash
docker load -i fasto-image.tar
```

Then use `docker-compose up -d` with `image: fasto:latest` in your docker-compose.yaml.

## Troubleshooting

### If GitHub Actions build fails:

1. Check the Actions tab in your GitHub repository
2. Ensure the Dockerfile is correct
3. Check that all dependencies are listed in `package.json`

### If local build fails on ZimaOS:

See `ZIMAOS_BUILD_SOLUTIONS.md` for detailed troubleshooting steps.

### If image pull fails:

- Ensure the image is public (for public repos)
- Check your internet connection
- Try: `docker pull ghcr.io/rikcancode/fasto:latest --platform linux/amd64` (specify platform)

## Recommended Approach

**For ZimaOS deployment, use Option 1 (GitHub Actions)** because:
- ✅ No need to build on ZimaOS (saves resources)
- ✅ Multi-architecture support (works on any ZimaOS device)
- ✅ Automatic updates when you push changes
- ✅ No filesystem permission issues
- ✅ Faster deployment

Just pull the image and run!
