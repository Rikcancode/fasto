# Easiest Method: Copy Files from Windows to ZimaOS

Since you already have the files on Windows, this is the fastest method:

## Step 1: Create a ZIP file on Windows

1. **On Windows**, navigate to: `e:\Cursor projects\Fasto`
2. **Select all files** EXCEPT:
   - `node_modules` folder (if it exists)
   - `.git` folder
   - `node-v24.13.0-linux-x64` folder (if it exists)
3. **Right-click** → **Send to** → **Compressed (zipped) folder**
4. Name it `fasto.zip`

## Step 2: Transfer to ZimaOS

### Option A: Using SCP (if you have SSH access)
```bash
# From Windows PowerShell or Command Prompt
scp fasto.zip user@zimaos-ip:/home/user/AppData/
```

### Option B: Using SFTP client
- Use WinSCP, FileZilla, or similar
- Connect to your ZimaOS device
- Upload `fasto.zip` to `~/AppData/`

### Option C: Using USB drive
1. Copy `fasto.zip` to a USB drive
2. Plug into ZimaOS
3. Copy from USB to `~/AppData/`

### Option D: Using ZimaOS web interface
- If ZimaOS has a file upload feature, use that

## Step 3: Extract and Build on ZimaOS

```bash
cd ~/AppData
unzip fasto.zip -d fasto
cd fasto
docker build -f Dockerfile --target production -t fasto:latest .
```

## Step 4: Update docker-compose.yaml

Edit `docker-compose.yaml` and change line 7:
```yaml
image: fasto:latest
```

## Step 5: Install via ZimaOS UI

Copy the `docker-compose.yaml` content and paste into ZimaOS.

---

## Alternative: Download Individual Files via Raw URLs

If ZIP doesn't work, download files one by one:

```bash
cd ~/AppData
mkdir fasto
cd fasto

# Download essential files
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/Dockerfile
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/docker-compose.yaml
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/package.json
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/package-lock.json

# Create directories
mkdir -p server public data

# Download server files
wget -O server/index.js https://raw.githubusercontent.com/Rikcancode/fasto/master/server/index.js
wget -O server/withings.js https://raw.githubusercontent.com/Rikcancode/fasto/master/server/withings.js

# Download public files
wget -O public/index.html https://raw.githubusercontent.com/Rikcancode/fasto/master/public/index.html
wget -O public/app.js https://raw.githubusercontent.com/Rikcancode/fasto/master/public/app.js
wget -O public/styles.css https://raw.githubusercontent.com/Rikcancode/fasto/master/public/styles.css
wget -O public/icon.png https://raw.githubusercontent.com/Rikcancode/fasto/master/public/icon.png

# Create data directory with empty goals
mkdir -p data
echo '[]' > data/goals.json

# Build
docker build -f Dockerfile --target production -t fasto:latest .
```
