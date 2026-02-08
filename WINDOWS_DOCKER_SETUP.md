# Installing Docker on Windows

You need Docker Desktop to build Docker images on Windows.

## ⚠️ IMPORTANT: Enable Virtualization First

**If you get "Virtualization support not detected" error**, you MUST enable virtualization in BIOS first!

See `ENABLE_VIRTUALIZATION_WINDOWS.md` for detailed step-by-step instructions.

Quick steps:
1. Restart computer and enter BIOS (usually F2, F10, F12, or Del)
2. Find "Virtualization" or "Intel VT-x" or "AMD-V" setting
3. Enable it
4. Save and exit BIOS
5. Enable Windows features (WSL 2, Virtual Machine Platform)
6. Then proceed with Docker Desktop installation below

## Option 1: Install Docker Desktop (Recommended)

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Download "Docker Desktop for Windows"
   - Choose the appropriate version (usually the latest stable)

2. **Install Docker Desktop**
   - Run the installer
   - Follow the installation wizard
   - Restart your computer if prompted

3. **Start Docker Desktop**
   - Launch Docker Desktop from Start menu
   - Wait for it to start (whale icon in system tray)
   - Make sure it says "Docker Desktop is running"

4. **Verify Installation**
   ```powershell
   docker --version
   docker-compose --version
   ```

5. **Build the Fasto Image**
   ```powershell
   cd "e:\Cursor projects\Fasto"
   docker build -f Dockerfile --target production -t fasto:latest .
   ```

6. **Export the Image**
   ```powershell
   docker save fasto:latest -o fasto-image.tar
   ```

## Option 2: Use WSL2 (Windows Subsystem for Linux)

If you have WSL2 installed, you can use Docker in WSL2:

1. **Install Docker in WSL2**
   ```bash
   # In WSL2 terminal
   sudo apt update
   sudo apt install docker.io
   sudo service docker start
   ```

2. **Build in WSL2**
   ```bash
   cd /mnt/e/Cursor\ projects/Fasto
   docker build -f Dockerfile --target production -t fasto:latest .
   docker save fasto:latest -o fasto-image.tar
   ```

## Option 3: Build Directly on ZimaOS (Alternative Solutions)

If you can't install Docker on Windows, try these alternatives on ZimaOS:

### A. Fix Docker Build Issues on ZimaOS

Try building with different Docker settings:

```bash
# Check Docker version
docker version

# Try with different storage driver
sudo systemctl stop docker
# Edit Docker daemon config if needed

# Try building in a different location
mkdir -p ~/docker-build
cd ~/docker-build
# Copy Dockerfile and project files here
docker build -f Dockerfile --target production -t fasto:latest .
```

### B. Use Podman (Alternative Container Runtime)

If Docker has issues, ZimaOS might support Podman:

```bash
# Check if podman is available
podman --version

# Build with podman
podman build -f Dockerfile --target production -t fasto:latest .
podman save fasto:latest -o fasto-image.tar
```

### C. Use ZimaOS App Store/Repository

Check if ZimaOS has a way to install Docker or container tools through its app management interface.

## Option 4: Use a Cloud Build Service

If you have access to cloud services:

1. **GitHub Actions** - Build in CI/CD
2. **Docker Hub Build** - Automated builds
3. **Cloud VM** - Spin up a temporary Linux VM to build

## Quick Check: Is Docker Already Installed?

Try these commands to check:

```powershell
# Check if Docker is in PATH
where docker

# Check if Docker Desktop is installed
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

# Check WSL
wsl --list --verbose
```

## After Installing Docker Desktop

Once Docker Desktop is installed and running:

1. **Build the image:**
   ```powershell
   cd "e:\Cursor projects\Fasto"
   docker build -f Dockerfile --target production -t fasto:latest .
   ```

2. **Export it:**
   ```powershell
   docker save fasto:latest -o fasto-image.tar
   ```

3. **Transfer to ZimaOS** (via SMB share, USB, etc.)

4. **On ZimaOS:**
   ```bash
   docker load -i fasto-image.tar
   docker-compose -f fasto.yml up -d
   ```

## Troubleshooting Docker Desktop

- **WSL 2 backend required**: Docker Desktop needs WSL 2. Install WSL 2 if prompted.
- **Virtualization enabled**: Make sure virtualization is enabled in BIOS.
- **Windows version**: Requires Windows 10 64-bit: Pro, Enterprise, or Education (Build 15063+) or Windows 11.
