#!/bin/bash

# Install system dependencies for Puppeteer
echo "Installing Chrome dependencies..."
apt-get update && apt-get install -y \
    fonts-liberation \
    gconf-service \
    libappindicator1 \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libfontconfig1 \
    libgbm-dev \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libicu-dev \
    libjpeg-dev \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpng-dev \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils

# Install Chrome
echo "Installing Chrome..."
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb
apt-get install -f -y

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
npm install --legacy-peer-deps
npm ci

echo "Building frontend..."
npm install --include=dev && npm run build && npm prune

echo "Moving back to root..."
cd ..