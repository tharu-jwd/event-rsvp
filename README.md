# AWS DevOps Portfolio Project

A Node.js application containerized with Docker and deployed to AWS EC2 with a fully automated CI/CD pipeline using GitHub Actions.

## Live Demo
http://13.60.89.129

## Architecture
GitHub (code) → GitHub Actions (CI/CD) → AWS EC2 (Docker container) → nginx (reverse proxy) → Port 80

## Tech Stack
- **App:** Node.js + Express
- **Container:** Docker (node:18-alpine)
- **Cloud:** AWS EC2 (t3.micro, Ubuntu 24.04)
- **CI/CD:** GitHub Actions
- **Web Server:** nginx (reverse proxy)
- **Networking:** AWS Security Groups

## CI/CD Pipeline
Every push to `main` automatically:
1. Builds a Docker image
2. Transfers the image to EC2 via SCP
3. Stops the old container
4. Starts the new container
5. App is live within ~2 minutes of pushing code

## API Endpoints
- `GET /` — returns app info and timestamp
- `GET /health` — health check endpoint
