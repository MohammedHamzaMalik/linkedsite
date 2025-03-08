#!/bin/bash

# Print Node and npm versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install root dependencies
echo "Installing root dependencies..."
npm ci --legacy-peer-deps

echo "Moving to frontend directory..."
cd frontend

echo "Installing frontend dependencies..."
export PATH="$PATH:./node_modules/.bin"
npx vite build
npm install --legacy-peer-deps
npm ci

echo "Building frontend..."
npm run build

echo "Moving back to root..."
cd ..