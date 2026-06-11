#!/bin/bash
# bump-cache.sh — Auto-bump cache busters before deploy
set -e
SHA=$(git rev-parse --short HEAD)
FILE="index.html"
sed -i '' "s|?v=[a-f0-9]*\"|?v=${SHA}\"|g" "$FILE"
sed -i '' "s|css/style.css?v=[a-f0-9]*|css/style.css?v=${SHA}|g" "$FILE"
sed -i '' "s/v=[a-f0-9]* cache buster/v=${SHA} cache buster/g" "$FILE"
# Also update cache buster in dictLoader.js for dict-zh.json fetch
sed -i '' "s|data/dict-zh.json?v=[a-f0-9]*|data/dict-zh.json?v=${SHA}|g" "$FILE"
sed -i '' "s|data/dict-zh.json?v=[a-f0-9]*|data/dict-zh.json?v=${SHA}|g" js/dictLoader.js
echo "✅ Cache busters bumped to ${SHA}"
