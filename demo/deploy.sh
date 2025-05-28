#!/bin/sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}🚀 Starting deployment...${NC}"

# Remove previous build
echo "${YELLOW}📦 Cleaning previous build...${NC}"
rm -rf ./dist

# Build the project
echo "${YELLOW}🔨 Building project...${NC}"
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "${RED}❌ Build failed! Deployment aborted.${NC}"
    exit 1
fi

echo "${GREEN}✅ Build successful!${NC}"

# Navigate to build output directory
cd ./dist

# Create .nojekyll file to ensure GitHub Pages serves all files
echo "" > .nojekyll

# Initialize git repo in dist folder
git init

# Set default branch to main
git checkout -b main

# Add all files
git add .

# Commit
git commit -m 'Deploy to gh-pages'

# Change this line to your repository URL
# Replace 'mfeldman143' with your GitHub username if different
echo "${YELLOW}📤 Pushing to GitHub Pages...${NC}"
git push --force git@github.com:mfeldman143/mgraph.forcelayout.git main:gh-pages

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "${GREEN}🎉 Successfully deployed to GitHub Pages!${NC}"
    echo "${GREEN}Your site will be available at: https://mfeldman143.github.io/mgraph.forcelayout/${NC}"
else
    echo "${RED}❌ Failed to push to GitHub Pages${NC}"
fi

# Go back to project root
cd ../