# Building Docker Image on Windows and Transferring to ZimaOS

If you're having filesystem issues building on ZimaOS, you can build the image on Windows and transfer it.

## Prerequisites

**You need Docker Desktop installed on Windows.** 

**⚠️ If you get "Virtualization support not detected" error:**
- See `ENABLE_VIRTUALIZATION_WINDOWS.md` for BIOS setup instructions
- Enable virtualization in BIOS first, then install Docker Desktop

See `WINDOWS_DOCKER_SETUP.md` for Docker Desktop installation instructions.

## Step 1: Build on Windows

On your Windows machine (in the Fasto project directory):

```powershell
# Navigate to project directory
cd "e:\Cursor projects\Fasto"

# Build the Docker image
docker build -f Dockerfile --target production -t fasto:latest .

# Verify the image was created
docker images | findstr fasto
```

## Step 2: Export the Image

Export the image to a tar file:

```powershell
# Export the image to a tar file
docker save fasto:latest -o fasto-image.tar

# Or compress it (recommended for transfer)
docker save fasto:latest | gzip > fasto-image.tar.gz
```

**Note**: The tar file will be large (several hundred MB). Compressing it with gzip will make it smaller for transfer.

## Step 3: Transfer to ZimaOS

Transfer the tar file to ZimaOS using one of these methods:

### Option A: SMB/CIFS File Share
- Copy `fasto-image.tar` or `fasto-image.tar.gz` to your ZimaOS shared folder
- Or drag and drop via Windows File Explorer if ZimaOS is accessible

### Option B: SCP (if SSH is enabled)
```powershell
# From Windows PowerShell (if you have OpenSSH installed)
scp fasto-image.tar.gz user@192.168.68.74:~/AppData/fasto/
```

### Option C: USB Drive
- Copy the tar file to a USB drive
- Plug into ZimaOS and copy to `~/AppData/fasto/`

## Step 4: Import on ZimaOS

On ZimaOS, import the image:

```bash
cd ~/AppData/fasto

# If you transferred the compressed version, decompress first
gunzip fasto-image.tar.gz

# Import the image
docker load -i fasto-image.tar

# Verify the image was imported
docker images | grep fasto
```

You should see `fasto:latest` in the image list.

## Step 5: Use with Docker Compose or Docker CLI

Now you can use the imported image:

### Option A: Docker Compose
```bash
docker-compose -f fasto.yml up -d
```

### Option B: Docker CLI
```bash
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

## Alternative: Use Docker Hub (If Available)

If you have Docker Hub access, you can push from Windows and pull on ZimaOS:

### On Windows:
```powershell
# Tag for Docker Hub (replace 'yourusername' with your Docker Hub username)
docker tag fasto:latest yourusername/fasto:latest

# Login to Docker Hub
docker login

# Push the image
docker push yourusername/fasto:latest
```

### On ZimaOS:
```bash
# Pull the image
docker pull yourusername/fasto:latest

# Tag it locally
docker tag yourusername/fasto:latest fasto:latest
```

## File Size Estimates

- Uncompressed tar: ~300-500 MB
- Compressed (gzip): ~100-200 MB

Compression is recommended for faster transfer.
