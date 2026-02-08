#!/bin/bash
# Install dependencies using local npm if available, otherwise system npm
cd "$(dirname "$0")" || exit 1
SCRIPT_DIR="$(pwd)"
LOCAL_NODE="$SCRIPT_DIR/node-v24.13.0-linux-x64/bin/node"
LOCAL_NPM="$SCRIPT_DIR/node-v24.13.0-linux-x64/bin/npm"
LOCAL_NPM_ALT="$SCRIPT_DIR/node-v24.13.0-linux-x64/lib/node_modules/npm/bin/npm-cli.js"

if [ -f "$LOCAL_NODE" ]; then
    echo "Using local Node.js..."
    if [ -f "$LOCAL_NPM" ]; then
        "$LOCAL_NPM" install
    elif [ -f "$LOCAL_NPM_ALT" ]; then
        "$LOCAL_NODE" "$LOCAL_NPM_ALT" install
    else
        echo "ERROR: npm not found in Node.js distribution"
        exit 1
    fi
else
    echo "Local Node.js not found at $LOCAL_NODE"
    echo "Trying system npm..."
    if command -v npm >/dev/null 2>&1; then
        npm install
    else
        echo "ERROR: npm not found. Please ensure Node.js is installed or the node-v24.13.0-linux-x64 folder exists."
        exit 1
    fi
fi
