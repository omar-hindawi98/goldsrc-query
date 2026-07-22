#!/bin/bash
set -e

cd "$HLDS_DIR"

export LD_LIBRARY_PATH="$HLDS_DIR:$LD_LIBRARY_PATH"

exec ./hlds_linux -console "$@"
