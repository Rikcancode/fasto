# Building Fasto on ZimaOS - No Git Required

## Method 1: Download Repository as ZIP (Easiest)

### Step 1: Download the ZIP file
On your ZimaOS device, use wget or curl:

```bash
cd ~/AppData
wget https://github.com/Rikcancode/fasto/archive/refs/heads/master.zip
unzip master.zip
mv fasto-master fasto
cd fasto
```

Or download manually:
1. Go to: https://github.com/Rikcancode/fasto/archive/refs/heads/master.zip
2. Download the ZIP file
3. Upload it to ZimaOS at `~/AppData/`
4. Extract it:
   ```bash
   cd ~/AppData
   unzip master.zip
   mv fasto-master fasto
   cd fasto
   ```

### Step 2: Build the Docker image
```bash
docker build -f Dockerfile --target production -t fasto:latest .
```

### Step 3: Update docker-compose.yaml
Edit `docker-compose.yaml` and change line 7:
```yaml
image: fasto:latest
```

### Step 4: Install via ZimaOS UI
Copy the `docker-compose.yaml` content and paste into ZimaOS.

---

## Method 2: Use Public Git Clone (No Auth)

Try cloning without authentication:

```bash
cd ~/AppData
git clone https://github.com/Rikcancode/fasto.git
cd fasto
docker build -f Dockerfile --target production -t fasto:latest .
```

If that still fails, use Method 1 (ZIP download).

---

## Method 3: Copy Files Directly

If you have access to the files from Windows:

1. **On Windows**: Zip the entire `fasto` folder (excluding `node_modules` and `.git`)
2. **Transfer to ZimaOS**: Use SCP, SFTP, or USB drive
3. **On ZimaOS**:
   ```bash
   cd ~/AppData
   # Extract your zip file here
   cd fasto
   docker build -f Dockerfile --target production -t fasto:latest .
   ```

---

## Method 4: Download Individual Files

If you only need the Dockerfile and docker-compose.yaml:

```bash
cd ~/AppData
mkdir fasto
cd fasto

# Download Dockerfile
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/Dockerfile

# Download docker-compose.yaml
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/docker-compose.yaml

# Download package.json
wget https://raw.githubusercontent.com/Rikcancode/fasto/master/package.json

# Download server files
mkdir -p server
wget -O server/index.js https://raw.githubusercontent.com/Rikcancode/fasto/master/server/index.js
wget -O server/withings.js https://raw.githubusercontent.com/Rikcancode/fasto/master/server/withings.js

# Download public files
mkdir -p public
wget -O public/index.html https://raw.githubusercontent.com/Rikcancode/fasto/master/public/index.html
wget -O public/app.js https://raw.githubusercontent.com/Rikcancode/fasto/master/public/app.js
wget -O public/styles.css https://raw.githubusercontent.com/Rikcancode/fasto/master/public/styles.css

# Create data directory
mkdir -p data
echo '[]' > data/goals.json

# Build
docker build -f Dockerfile --target production -t fasto:latest .
```

---

## Recommended: Method 1 (ZIP Download)

The ZIP download method is the easiest and most reliable. Just download the repository as a ZIP file and extract it.
