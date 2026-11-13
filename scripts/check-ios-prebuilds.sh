#!/usr/bin/env bash
# Checks that Expo's prebuilt iOS frameworks agree with each other.
#
# Expo ships some modules (ExpoModulesCore, ExpoFileSystem, ...) as precompiled
# XCFrameworks inside their npm packages. If the lockfile pairs a module with an
# older ExpoModulesCore than it was compiled against, the release build links
# fine but dyld kills the app at launch with "Symbol not found" (TestFlight
# build 3). This unpacks the release frameworks and fails if any of them imports
# a Swift symbol that the framework it comes from does not export.
set -euo pipefail

# Linux runners have llvm-nm (often only as llvm-nm-<version>); macOS's nm is llvm-nm.
NM=$(command -v llvm-nm || ls /usr/bin/llvm-nm-* 2>/dev/null | sort -V | tail -1 || true)
if [ -z "$NM" ] && [ "$(uname)" = Darwin ]; then NM=nm; fi
if [ -z "$NM" ]; then
  echo "llvm-nm not found" >&2
  exit 1
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

find node_modules -path '*/prebuilds/output/release/xcframeworks/*.tar.gz' -not -name '*Headers*' \
  -exec tar xzf {} -C "$WORK" \;

bin() { echo "$WORK/$1.xcframework/ios-arm64/$1.framework/$1"; }

names=()
for dir in "$WORK"/*.xcframework; do
  name=$(basename "$dir" .xcframework)
  [ -f "$(bin "$name")" ] && names+=("$name")
done
if [ ${#names[@]} -eq 0 ]; then
  echo "No prebuilt iOS frameworks found; nothing to check."
  exit 0
fi

for name in "${names[@]}"; do
  "$NM" -gU "$(bin "$name")" | awk '{print $NF}' | sort -u > "$WORK/$name.exports"
done

status=0
for user in "${names[@]}"; do
  "$NM" -u "$(bin "$user")" | awk '{print $NF}' | sort -u > "$WORK/imports"
  for provider in "${names[@]}"; do
    [ "$user" = "$provider" ] && continue
    # Swift mangles the defining module into the symbol: $s<length><Module>...
    prefix="_\$s${#provider}${provider}"
    missing=$(grep -F "$prefix" "$WORK/imports" | comm -23 - "$WORK/$provider.exports" || true)
    if [ -n "$missing" ]; then
      echo "$user uses symbols that $provider does not export:"
      echo "$missing" | sed 's/^/  /'
      status=1
    fi
  done
done

if [ $status -ne 0 ]; then
  echo
  echo "Prebuilt Expo frameworks are out of sync; the iOS app would crash at launch."
  echo "Run 'npx expo install --fix' (and bump 'expo' to the latest patch) to realign them."
else
  echo "Prebuilt iOS frameworks agree: ${names[*]}"
fi
exit $status
