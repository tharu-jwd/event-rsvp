# Event RSVP

A full-stack event registration app built with Next.js and Node.js — containerized with Docker and deployed to AWS EC2 via an automated GitHub Actions CI/CD pipeline.

## Live Demo
http://13.60.89.129

## Architecture
```
GitHub → GitHub Actions (CI/CD) → AWS EC2 → nginx (port 80)
                                              ├── /api/* → Express API (port 3000)
                                              └── /*     → Next.js client (port 3001)
```

## Tech Stack
- **Frontend:** Next.js, Tailwind CSS
- **Backend:** Node.js, Express
- **Container:** Docker (node:18-alpine, multi-stage build)
- **Cloud:** AWS EC2 (t3.micro, Ubuntu 24.04)
- **CI/CD:** GitHub Actions
- **Web Server:** nginx (reverse proxy, gzip, security headers)

## Features
- Public RSVP page with live attendee count
- Form validation and duplicate email detection
- Password-protected admin dashboard
- CSV export of registrations
- Data persisted via Docker volume (JSON file)

## API Endpoints
- `GET /api/event` — event details and registration count
- `POST /api/rsvp` — submit a registration
- `GET /api/rsvps` — all registrations (admin)
- `DELETE /api/rsvps/:id` — remove a registration (admin)
- `GET /health` — health check

## CI/CD Pipeline
Every push to `main` automatically:
1. Builds Docker images for API and client
2. Transfers images to EC2 via SCP
3. Replaces running containers
4. Updates nginx config and reloads
5. Runs a health check to confirm deployment

## Infrastructure
- AWS IAM with least-privilege permissions
- EC2 Security Groups (ports 22, 80, 443, 3000)
- SSH key authentication
- GitHub Actions Secrets for credentials
- Docker `--restart unless-stopped` for automatic recovery

## Local Development
```bash
# API (port 3000)
npm install
node index.js

# Client (port 3001)
cd client
cp .env.example .env.local
npm install
npm run dev
```

## What I Would Add Next
- HTTPS via Let's Encrypt
- Domain name via AWS Route 53
- AWS ECR for image registry
- CloudWatch for logging and monitoring
- RDS or DynamoDB for persistent storage
- Terraform for infrastructure as code
