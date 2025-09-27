# Driftboard

A modern, web-based Kanban board application built with Next.js and Firebase. Driftboard provides a clean, intuitive interface for managing your projects and tasks with drag-and-drop functionality, real-time collaboration, and comprehensive task management features.

*Originally created with [v0.app](https://v0.app) and enhanced with custom features*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/michael-paulukonis-projects/v0-no-content)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/6kncB1lKSt8)

## Features

- **Kanban Board Management**: Create, organize, and manage boards for different projects
- **Drag & Drop Interface**: Intuitive task management with smooth drag-and-drop functionality
- **Real-time Collaboration**: Firebase-powered real-time updates and synchronization
- **Task Management**: Create, edit, and organize cards with comments and history tracking
- **User Authentication**: Secure Firebase Authentication integration
- **Responsive Design**: Modern UI built with Tailwind CSS and shadcn/ui components

## Quick Start

### Docker Deployment (Recommended)

The fastest way to get Driftboard running locally:

```bash
# 1. Clone the repository
git clone https://github.com/MichaelPaulukonis/v0-driftboard.git
cd v0-driftboard

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# 3. Run with Docker
./docker.sh prod
```

Visit `http://localhost:3000` to access your Driftboard instance.

**📖 Full Docker Documentation**: See [`docs/docker-setup.md`](docs/docker-setup.md) for comprehensive setup instructions, development workflow, and troubleshooting.

### Traditional Development

Alternatively, run Driftboard using Node.js directly:

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Add your Firebase configuration to .env.local

# Start development server
pnpm dev
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Firebase (Authentication + Firestore)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Drag & Drop**: @atlaskit/pragmatic-drag-and-drop
- **Package Manager**: pnpm
- **Deployment**: Vercel, Docker

## Documentation

- **[Docker Setup Guide](docs/docker-setup.md)** - Complete containerization setup and usage
- **[Project Overview](docs/overview.md)** - Comprehensive project architecture and features
- **[Firebase Setup](docs/firebase-setup.md)** - Database and authentication configuration
- **[Testing Strategy](docs/testing.md)** - Testing approach and guidelines
- **[URL Linking Feature](docs/url-linking.md)** - Automatic URL detection and linking functionality

## Deployment

### Vercel (Production)

Your project is live at:

**[https://vercel.com/michael-paulukonis-projects/v0-no-content](https://vercel.com/michael-paulukonis-projects/v0-no-content)**

### v0.app Integration

Continue building your app on:

**[https://v0.app/chat/projects/6kncB1lKSt8](https://v0.app/chat/projects/6kncB1lKSt8)**

This repository stays in sync with your deployed chats on [v0.app](https://v0.app). Changes made to your deployed app will be automatically pushed to this repository.

## Contributing

We welcome contributions! Please see our [GitHub Copilot Instructions](.github/copilot-instructions.md) for development guidelines and coding standards.

## Project Status

Driftboard is actively developed and production-ready. Key features include:

- ✅ Core Kanban functionality with drag-and-drop
- ✅ Real-time collaboration and data persistence
- ✅ User authentication and authorization
- ✅ Smart URL linking in cards and comments
- ✅ Docker containerization for easy deployment
- ✅ Comprehensive testing suite
- ✅ Modern responsive design

## License

This project is open source and available under the MIT License.