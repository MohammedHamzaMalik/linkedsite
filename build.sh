#!/bin/bash

# Print Node and npm versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install root dependencies
echo "Installing root dependencies..."
npm ci

echo "Moving to frontend directory..."
cd frontend

echo "Installing frontend dependencies..."
npm install --legacy-peer-deps
npm ci

echo "Building frontend..."
npm run build

echo "Moving back to root..."
cd ..