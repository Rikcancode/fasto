#!/bin/bash
# Use local node if available, otherwise use system node
cd "$(dirname "$0")" || exit 1
SCRIPT_DIR="$(pwd)"
LOCAL_NODE="$SCRIPT_DIR/node-v24.13.0-linux-x64/bin/node"

if [ -f "$LOCAL_NODE" ]; then
    exec "$LOCAL_NODE" "$SCRIPT_DIR/server/index.js" "$@"
else
    exec node "$SCRIPT_DIR/server/index.js" "$@"
fi
