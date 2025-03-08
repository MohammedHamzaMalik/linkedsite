#!/bin/bash

echo "Installing root dependencies..."
npm install

echo "Moving to frontend directory..."
cd frontend

echo "Installing frontend dependencies..."
npm install --legacy-peer-deps

echo "Building frontend..."
npm run build

echo "Moving back to root..."
cd ..