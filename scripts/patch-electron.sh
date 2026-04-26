#!/bin/bash
# Patches the local Electron.app to show JYRY Command Center branding during dev mode.
# Runs automatically via postinstall so `npm install` doesn't revert branding.

ELECTRON_PLIST="node_modules/electron/dist/Electron.app/Contents/Info.plist"
ICON_SRC="build/icon.icns"
ICON_DEST="node_modules/electron/dist/Electron.app/Contents/Resources/electron.icns"

if [ -f "$ELECTRON_PLIST" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'JYRY Command Center'" "$ELECTRON_PLIST"
  /usr/libexec/PlistBuddy -c "Set :CFBundleName 'JYRY Command Center'" "$ELECTRON_PLIST"
  echo "Patched Electron.app name for JYRY Command Center"
fi

if [ -f "$ICON_SRC" ] && [ -f "$ICON_DEST" ]; then
  cp "$ICON_SRC" "$ICON_DEST"
  echo "Patched Electron.app icon for JYRY Command Center"
fi
