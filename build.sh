#!/bin/bash

# Print Node and npm versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install Vite globally first
echo "Installing Vite globally..."
npm install -g vite

# Install root dependencies
echo "Installing root dependencies..."
npm ci --legacy-peer-deps

echo "Moving to frontend directory..."
cd frontend

# Install frontend dependencies with focus on Vite
echo "Installing Vite and core dependencies..."
npm install vite @vitejs/plugin-react --save

echo "Installing frontend dependencies..."
npx vite build
npm install --legacy-peer-deps
npm ci

echo "Building frontend..."
npm install --include=dev && npm run build && npm prune

echo "Moving back to root..."
cd ..