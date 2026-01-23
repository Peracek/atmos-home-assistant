#!/bin/bash
# Build script to prepare the addon for Home Assistant

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Copying source files to addon directory..."

# Copy package.json
cp "$PROJECT_DIR/package.json" "$SCRIPT_DIR/"

# Copy main entry point
cp "$PROJECT_DIR/index.js" "$SCRIPT_DIR/"

# Copy src directory
rm -rf "$SCRIPT_DIR/src"
cp -r "$PROJECT_DIR/src" "$SCRIPT_DIR/"

echo "Addon ready in: $SCRIPT_DIR"
echo ""
echo "To install in Home Assistant:"
echo "1. Copy the ha-addon folder to your Home Assistant addons directory"
echo "2. Or add this repository as a custom addon repository"
