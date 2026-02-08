# Enabling Virtualization on Windows for Docker Desktop

Docker Desktop requires virtualization to be enabled in your BIOS/UEFI settings. Follow these steps:

## Step 1: Check if Virtualization is Currently Enabled

### Check in Windows:

**Method 1: Task Manager**
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to the "Performance" tab
3. Click "CPU"
4. Look for "Virtualization" - it should say "Enabled"

**Method 2: PowerShell**
```powershell
# Run PowerShell as Administrator
Get-ComputerInfo | Select-Object HyperV*

# Or check specifically:
systeminfo | findstr /C:"Hyper-V"
```

**Method 3: Command Prompt**
```cmd
systeminfo | findstr /C:"Hyper-V"
```

If it says "A hypervisor has been detected" or "Virtualization Enabled in Firmware: Yes", virtualization is already enabled.

## Step 2: Enable Virtualization in BIOS/UEFI

If virtualization is disabled, you need to enable it in BIOS:

### For Most Computers:

1. **Restart your computer**
2. **Enter BIOS/UEFI Setup**
   - Common keys: `F2`, `F10`, `F12`, `Del`, `Esc`
   - Look for message during boot: "Press [KEY] to enter Setup"
   - Or check your computer's manual/manufacturer website

3. **Find Virtualization Settings**
   - Look for: "Virtualization", "Intel VT-x", "AMD-V", "SVM Mode"
   - Common locations:
     - Advanced → CPU Configuration
     - Advanced → Processor Configuration
     - Security → Virtualization
     - Configuration → Virtualization Technology

4. **Enable Virtualization**
   - Set to: **Enabled**
   - Options might be:
     - Intel VT-x Technology: **Enabled**
     - AMD-V: **Enabled**
     - Virtualization Technology: **Enabled**
     - SVM Mode: **Enabled**

5. **Save and Exit**
   - Press `F10` (usually) or find "Save & Exit"
   - Confirm changes
   - Computer will restart

### For Specific Manufacturers:

**Dell:**
- BIOS → System Configuration → Virtualization Technology → Enable

**HP:**
- Advanced → System Options → Virtualization Technology (VTx) → Enable

**Lenovo:**
- Security → Virtualization → Intel Virtualization Technology → Enable

**ASUS:**
- Advanced → CPU Configuration → Intel Virtualization Technology → Enable

**Acer:**
- Advanced → Processor Configuration → Intel Virtualization Technology → Enable

## Step 3: Enable Windows Features

After enabling in BIOS, enable Windows features:

### Enable Hyper-V (Windows Pro/Enterprise/Education):

1. **Open Windows Features**
   - Press `Win + R`
   - Type: `optionalfeatures` and press Enter
   - Or search "Turn Windows features on or off"

2. **Enable Required Features**
   - Check: **Hyper-V** (if available)
   - Check: **Virtual Machine Platform**
   - Check: **Windows Subsystem for Linux** (WSL)
   - Click OK and restart if prompted

### Enable WSL 2 (Required for Docker Desktop):

**Method 1: PowerShell (as Administrator)**
```powershell
# Enable WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart computer
Restart-Computer
```

**Method 2: GUI**
1. Search "Turn Windows features on or off"
2. Check:
   - ☑ Windows Subsystem for Linux
   - ☑ Virtual Machine Platform
3. Click OK and restart

## Step 4: Install WSL 2 Linux Kernel Update

After restarting:

1. Download WSL2 kernel update:
   - https://aka.ms/wsl2kernel
   - Or search "WSL2 Linux kernel update package"

2. Install the update package

3. Set WSL 2 as default:
```powershell
# Run PowerShell as Administrator
wsl --set-default-version 2
```

## Step 5: Verify Virtualization is Enabled

After BIOS changes and restart:

```powershell
# Check virtualization status
systeminfo | findstr /C:"Hyper-V"

# Should show: "A hypervisor has been detected"
```

## Step 6: Install Docker Desktop

Now that virtualization is enabled:

1. **Download Docker Desktop**
   - https://www.docker.com/products/docker-desktop/
   - Download "Docker Desktop for Windows"

2. **Install Docker Desktop**
   - Run the installer
   - Make sure "Use WSL 2 instead of Hyper-V" is checked (recommended)
   - Complete installation

3. **Start Docker Desktop**
   - Launch from Start menu
   - Wait for it to fully start (whale icon in system tray)
   - Should say "Docker Desktop is running"

4. **Verify Installation**
```powershell
docker --version
docker-compose --version
```

## Step 7: Build Fasto Image

Once Docker Desktop is running:

```powershell
cd "e:\Cursor projects\Fasto"
docker build -f Dockerfile --target production -t fasto:latest .
```

## Troubleshooting

### "Virtualization is disabled in the firmware"

- Make sure you saved BIOS changes and restarted
- Some BIOS have "Secure Boot" that needs to be disabled first
- Check if your CPU supports virtualization (most modern CPUs do)

### "WSL 2 installation is incomplete"

- Make sure WSL 2 kernel update is installed
- Run: `wsl --update` in PowerShell (as admin)
- Restart computer

### "Hardware assisted virtualization and data execution protection must be enabled"

- Enable in BIOS (see Step 2)
- Make sure DEP (Data Execution Prevention) is enabled in Windows

### Check CPU Support

Your CPU must support virtualization:
- **Intel**: VT-x (Intel Virtualization Technology)
- **AMD**: AMD-V (AMD Virtualization)

Most CPUs from 2006+ support it. Check your CPU model:
```powershell
Get-WmiObject Win32_Processor | Select-Object Name
```

## Alternative: Use WSL 2 Directly

If Docker Desktop still has issues, you can use Docker in WSL 2:

1. Install a Linux distribution from Microsoft Store (Ubuntu recommended)
2. Install Docker in WSL 2:
```bash
# In WSL 2 terminal
sudo apt update
sudo apt install docker.io
sudo service docker start
```

3. Build in WSL 2:
```bash
cd /mnt/e/Cursor\ projects/Fasto
docker build -f Dockerfile --target production -t fasto:latest .
```

## Still Having Issues?

- Check your computer's manual for BIOS key
- Contact your IT department if it's a work computer
- Some computers have virtualization disabled by default for security
- Some older computers may not support virtualization
