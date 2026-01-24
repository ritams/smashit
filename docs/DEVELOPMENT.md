# Local Development Guide

This guide covers the workflow for developing Avith on your local machine.

## 🛠️ Environment Setup

Before starting, ensure you have PostgreSQL and Redis running locally.

1.  **Dependencies**: Install with `pnpm install`.
2.  **Environment Variables**: Create `.env` files from `.env.example` in:
    - `apps/web/.env`
    - `apps/api/.env`
    - `packages/database/.env`
3.  **Database Initial Sync**:
    ```bash
    pnpm db:generate
    pnpm db:push
    ```

## 🗄️ Database Workflow (Prisma Migrations)

Avith uses Prisma Migrations to keep local and production databases in sync safely.

### 1. Making Schema Changes
When you need to add a field, table, or relation:
1.  Modify `packages/database/prisma/schema.prisma`.
2.  Run the following command in the root:
    ```bash
    npx prisma migrate dev --name <description> --schema packages/database/prisma/schema.prisma
    ```
    *Replace `<description>` with a short name like `add_user_bio`.*

### 2. What this command does:
- Generates a new SQL migration file in `packages/database/prisma/migrations`.
- Applies the change to your **local** database immediately.
- Regenerates the Prisma Client.

### 3. Deploying the change:
- **Commit** the newly generated migration folder to Git.
- **Push** to GitHub.
- On the server, running `./deploy_manual.sh` will automatically apply the new migration safely to the production database using `prisma migrate deploy`.

> [!IMPORTANT]
> **Never** skip the `migrate dev` step locally. This is what generates the migration history that the production server depends on.

## 🚀 Running the App

Start the development environment (Next.js, API, and background workers):
```bash
pnpm dev
```

## 📦 Project Structure

- `apps/web`: Next.js frontend (shadcn/ui, Tailwind).
- `apps/api`: Express.js backend (BullMQ, SSE).
- `packages/database`: Prisma schema and shared client.
- `packages/validators`: Shared Zod schemas.
- `packages/types`: Shared TypeScript interfaces.
