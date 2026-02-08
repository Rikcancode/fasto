#!/bin/bash
# Use local node/npm if available, otherwise use system
cd "$(dirname "$0")" || exit 1
SCRIPT_DIR="$(pwd)"
LOCAL_NODE="$SCRIPT_DIR/node-v24.13.0-linux-x64/bin/node"
LOCAL_NPM="$SCRIPT_DIR/node-v24.13.0-linux-x64/bin/npm"
LOCAL_NPM_ALT="$SCRIPT_DIR/node-v24.13.0-linux-x64/lib/node_modules/npm/bin/npm-cli.js"

if [ -f "$LOCAL_NODE" ]; then
    # Install nodemon if not already installed
    if [ ! -d "$SCRIPT_DIR/node_modules/nodemon" ]; then
        if [ -f "$LOCAL_NPM" ]; then
            "$LOCAL_NPM" install
        elif [ -f "$LOCAL_NPM_ALT" ]; then
            "$LOCAL_NODE" "$LOCAL_NPM_ALT" install
        fi
    fi
    # Use PATH to find nodemon wrapper, or run nodemon.js directly
    export PATH="$SCRIPT_DIR/node-v24.13.0-linux-x64/bin:$PATH"
    NODEMON_JS="$SCRIPT_DIR/node_modules/nodemon/bin/nodemon.js"
    if [ -f "$NODEMON_JS" ]; then
        exec "$LOCAL_NODE" "$NODEMON_JS" "$SCRIPT_DIR/server/index.js"
    else
        exec "$SCRIPT_DIR/node_modules/.bin/nodemon" "$SCRIPT_DIR/server/index.js"
    fi
else
    exec nodemon "$SCRIPT_DIR/server/index.js"
fi
