# SmashIt Deployment Guide

## Prerequisites
- **Local Machine**: Docker installed.
- **Server**: Oracle Cloud (Ubuntu/Oracle Linux).
- **SSH Access**: You must be able to SSH into your server.

## 1. Initial Server Setup (One-time)
1.  Copy the `deploy` folder to your server:
    ```bash
    scp -r deploy ubuntu@<YOUR_SERVER_IP>:~/avith-deploy
    ```
2.  SSH into the server and run the swap script (CRITICAL for 1GB RAM):
    ```bash
    ssh ubuntu@<YOUR_SERVER_IP>
    cd smashit-deploy
    chmod +x setup_swap.sh start.sh
    ./setup_swap.sh
    ```

## 2. Deploy Update (Repeat for every change)
I have created a script [deploy_local.sh](file:///Users/ritam/projects/smashit/deploy_local.sh) that automates the whole process.

1.  Open `deploy_local.sh` and set your `SERVER_IP`.
2.  Run the script from your terminal:
    ```bash
    chmod +x deploy_local.sh
    ./deploy_local.sh
    ```

### What the script does:
- Builds both Web and API Docker images locally.
- Compresses them to save bandwidth.
- SCPs everything to your server.
- Triggers the restart script on the server.

## Troubleshooting
- **Database**: The database data is stored in a docker volume `postgres_data`. It persists even if you restart containers.
- **Logs**: To see logs, ssh into server and run: `cd ~/smashit-deploy && docker compose logs -f`
