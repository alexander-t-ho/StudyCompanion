#!/bin/bash
# Helper script to ensure correct Ruby environment is used

# Initialize rbenv
eval "$(rbenv init -)"

# Verify Ruby version
echo "Ruby version: $(ruby --version)"
echo "Ruby path: $(which ruby)"
echo "Bundler version: $(bundle --version)"

# Set environment
export PATH="$HOME/.rbenv/shims:$PATH"

