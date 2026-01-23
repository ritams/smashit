# Avith - Multi-Tenant Booking Platform

A modern scheduling and booking application for organizations. Book spaces, manage slots, and coordinate with your team.

## Features

- **Multi-tenant**: Each organization gets their own subdomain
- **Real-time updates**: SSE for live slot availability
- **Conflict-free booking**: Queue-based booking with transaction guarantees
- **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn/ui
- **Google OAuth**: Simple sign-in with Google accounts

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 19, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Queue | BullMQ, Redis |
| Auth | NextAuth.js (Google OAuth) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd avith
   pnpm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   cp packages/database/.env.example packages/database/.env
   ```
   Update the `.env` files with your local database credentials and API keys.

3. **Initialize database**
   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

4. **Start development servers**
   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - API: http://localhost:4000

## Deployment (Manual)

This project is configured for manual deployment using PM2 on a VPS (e.g., Digital Ocean).

### Server Setup

See [docs/SETUP.md](docs/SETUP.md) for detailed server provisioning instructions (installing Node, PM2, Postgres, Redis).

### Deploying

1. **Push changes** to your repository.
2. **SSH into your server**.
3. **Run the deployment script**:
   ```bash
   ./deploy_manual.sh
   ```

   This script will:
   - Pull the latest changes
   - Install dependencies
   - Build the application
   - Reload the PM2 processes

## Project Structure

```
avith/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── types/        # Shared TypeScript types
│   └── validators/   # Zod validation schemas
├── ecosystem.config.js # PM2 configuration
└── deploy_manual.sh    # Deployment script
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed database with demo data |

## License

MIT
