# SmashIt - Multi-Tenant Booking Platform

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
- Docker (for PostgreSQL and Redis)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd smashit
   pnpm install
   ```

2. **Start PostgreSQL and Redis**
   ```bash
   docker compose up -d
   ```

3. **Set up environment variables**
   ```bash
   # Copy env files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   cp packages/database/.env.example packages/database/.env
   ```

4. **Set up Google OAuth** (for authentication)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add `http://localhost:3000` to authorized origins
   - Add `http://localhost:3000/api/auth/callback/google` to redirect URIs
   - Copy Client ID and Secret to `apps/web/.env`

5. **Initialize database**
   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - API: http://localhost:4000

### Development URLs

For local development, use path-based routing:
- Login: http://localhost:3000/login?org=demo-org
- Book: http://localhost:3000/org/demo-org/book
- Admin: http://localhost:3000/org/demo-org/admin

## Project Structure

```
smashit/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── types/        # Shared TypeScript types
│   └── validators/   # Zod validation schemas
├── docker-compose.yml
└── turbo.json
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
