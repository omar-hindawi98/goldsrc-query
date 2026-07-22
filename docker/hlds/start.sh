#!/bin/bash
set -e

cd "$HLDS_DIR"

# Call hlds_linux directly — bypasses hlds_run's steamcmd update check on
# every startup, which would add several minutes before the server is ready.
exec ./hlds_linux -console "$@"
