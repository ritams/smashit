# Server Setup for Avith

These instructions cover setting up a fresh Ubuntu/Debian server (Digital Ocean Droplet) for Avith.

## 1. System Updates & Tools

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential
```

## 2. Install Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node -v
npm -v
```

## 3. Install pnpm

```bash
sudo npm install -g pnpm
```

## 4. Install PM2

```bash
sudo npm install -g pm2
```

## 5. Install PostgreSQL 15

```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-client-15
```

### Configure Database

1. Switch to postgres user:
   ```bash
   sudo -i -u postgres
   ```

2. Create user and database:
   ```bash
   createuser --interactive
   # Enter name of role to add: avith
   # Shall the new role be a superuser? (y/n) n
   # Shall the new role be allowed to create databases? (y/n) y
   # Shall the new role be allowed to create more new roles? (y/n) n

   createdb avith
   ```

3. Set password:
   ```bash
   psql
   ALTER USER avith WITH PASSWORD 'your_secure_password';
   \q
   ```

4. Exit postgres user:
   ```bash
   exit
   ```

## 6. Install Redis

```bash
sudo apt install -y redis-server
```

Edit config to enable systemd supervision (optional but good practice):
```bash
sudo nano /etc/redis/redis.conf
# Find 'supervised no' and change to 'supervised systemd'
```

Restart Redis:
```bash
sudo systemctl restart redis.service
```

## 7. Clone & Setup Project

1. Generate SSH key for GitHub (if needed):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   cat ~/.ssh/id_ed25519.pub
   # Add this to your GitHub repo Deploy Keys
   ```

2. Clone repo:
   ```bash
   git clone <your_repo_git_url> ~/avith
   cd ~/avith
   ```

3. Setup Env Files:
   Create `.env` files in `apps/web/.env`, `apps/api/.env`, `packages/database/.env` and populate them with production values. 
   
   **Important**: Update `DATABASE_URL` in `packages/database/.env` and `apps/api/.env` to point to your local postgres:
   `postgresql://avith:your_secure_password@localhost:5432/avith`

## 8. Initial Deploy

```bash
./deploy_manual.sh
```

## 9. Setup Nginx (Reverse Proxy) - Optional but Recommended

Install Nginx:
```bash
sudo apt install -y nginx
```

Configure Nginx to proxy port 80/443 to 3000 (Web) and 4000 (API).
