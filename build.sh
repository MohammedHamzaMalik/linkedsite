#!/bin/bash
# Install dependencies for main app
npm install

# Install frontend dependencies and build
cd frontend
npm install
npm run build

# Return to root
cd ..