# Hiretrack Deployment Guide

This guide provides step-by-step instructions for deploying the `hiretrack` project to a Development VM and a Production VM. It covers project preparation, file transfer, asset management, Nginx configuration, PM2 setup, and SSH key configuration.

## Prerequisites

- **Tools**: Ensure `tar`, `scp`, `ssh`, `pm2`, and `nginx` are installed on both local and remote machines.
- **VM Access**:
  - Development VM: `root@YOUR_DEV_VM_HOST`
  - Production VM: `admin@YOUR_PROD_VM_HOST`
- **Dependencies**: Node.js and npm must be installed on both VMs to run the application.

## Development VM Deployment

### 1. Prepare the Project Locally

1. Navigate to the parent directory of the `hiretrack` project:

   ```bash
   cd ../
   ```

2. List directory contents to confirm files:

   ```bash
   ls
   # Expected output: hiretrack hiretrack.tar.gz next
   ```

3. Remove the old tarball:

   ```bash
   rm -r hiretrack.tar.gz
   ```

4. Remove the `next` directory:

   ```bash
   rm -r next
   ```

5. Verify the remaining directory:

   ```bash
   ls
   # Expected output: hiretrack
   ```

6. Create a tarball of the `hiretrack` project:

   ```bash
   tar -czvf hiretrack.tar.gz hiretrack
   ```

7. Transfer the tarball to the Development VM:
   ```bash
   scp hiretrack.tar.gz root@YOUR_DEV_VM_HOST:/root
   ```

### 2. Deploy on Development VM

1. SSH into the Development VM:

   ```bash
   ssh root@YOUR_DEV_VM_HOST
   ```

2. Remove the existing `hiretrack` directory:

   ```bash
   rm -r hiretrack
   ```

3. Extract the new tarball:

   ```bash
   tar -xzvf hiretrack.tar.gz
   ```

4. Remove the `assets` folder from the extracted `hiretrack`:

   ```bash
   rm -r hiretrack/assets
   ```

5. Stop all PM2 services:

   ```bash
   pm2 kill
   ```

6. Start the application with PM2:
   ```bash
   pm2 start "npm run start" --name "hiretrack"
   ```

### 3. Configure Nginx

1. Navigate to the Nginx configuration directory:

   ```bash
   cd /etc/nginx/sites-available
   ```

2. List directory contents to confirm files:

   ```bash
   ls
   # Expected output: default hire
   ```

3. Edit or create the `hire` configuration file:

   ```bash
   nano hire
   ```

4. Ensure the following configuration is present:

   ```nginx
   server {
       listen 80;
       server_name hire.upforce.tech;
       client_max_body_size 50M;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

# If that doesn't work (Gives 502 error) even after everythig is configured correctly, use this config

```nginx
# HTTP server block (proxies to Next.js)
server {
    listen 80;
    listen [::]:80;
    server_name hire-demo.upforce.tech;
    client_max_body_size 50M;

    # Buffer sizes for large headers
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    large_client_header_buffers 4 16k;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logging for debugging
    error_log /var/log/nginx/hire-demo.error.log;
    access_log /var/log/nginx/hire-demo.access.log;
}

# HTTPS server block
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name hire-demo.upforce.tech;
    client_max_body_size 50M;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/hire-demo.upforce.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hire-demo.upforce.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # HSTS (optional but recommended)
    add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload";

    # Buffer sizes for large headers
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    large_client_header_buffers 4 16k;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logging for debugging
    error_log /var/log/nginx/hire-demo.error.log;
    access_log /var/log/nginx/hire-demo.access.log;
}
```

5. Enable the configuration by creating a symbolic link:

   ```bash
   sudo ln -s /etc/nginx/sites-available/hire /etc/nginx/sites-enabled/
   ```

6. Test the Nginx configuration:

   ```bash
   sudo nginx -t
   ```

7. Reload Nginx to apply changes:
   ```bash
   sudo systemctl reload nginx
   ```

## Production VM Deployment

### 1. Prepare the Project Locally

1. Create a tarball of the `hiretrack` project:
   ```bash
   tar -czvf hiretrack.tar.gz hiretrack
   ```

### 2. Set Up SSH Keys (if not already configured)

1. Create a new RSA private key:

   ```bash
   nano ~/.ssh/custom_rsa_key
   # Paste your private key and save
   ```

2. Restrict permissions for the private key:

   ```bash
   chmod 600 ~/.ssh/custom_rsa_key
   ```

3. Generate the public key from the private key:

   ```bash
   ssh-keygen -y -f ~/.ssh/custom_rsa_key > ~/.ssh/custom_rsa_key.pub
   ```

4. Copy the public key to the Production VM:

   ```bash
   ssh-copy-id -i ~/.ssh/custom_rsa_key.pub admin@YOUR_PROD_VM_HOST
   ```

5. Transfer the tarball to the Production VM:
   ```bash
   scp -i ~/.ssh/custom_rsa_key hiretrack.tar.gz admin@YOUR_PROD_VM_HOST:~
   ```

### 3. Deploy on Production VM

1. SSH into the Production VM:

   ```bash
   ssh -i ~/.ssh/custom_rsa_key admin@YOUR_PROD_VM_HOST
   ```

2. Navigate to the home directory and verify the tarball:

   ```bash
   cd ~
   ls
   # Expected output: hiretrack.tar.gz
   ```

3. Extract the tarball:

   ```bash
   tar -xzvf hiretrack.tar.gz
   ```

4. Navigate to the `hiretrack` directory:

   ```bash
   cd hiretrack
   ```

5. Stop all PM2 instances:

   ```bash
   pm2 kill
   ```

6. Start the application with PM2:

   ```bash
   pm2 start "npm run start" --name "hiretrack"
   ```

7. Reload Nginx to apply changes:
   ```bash
   sudo systemctl reload nginx
   ```

## Notes

- **Asset Management**: The `assets` folder is removed during deployment to avoid overwriting existing data. Ensure the `assets` folder is backed up if needed.
- **Nginx Configuration**: Verify the `hire` configuration file is correctly set up and enabled in `/etc/nginx/sites-enabled/`.
- **PM2**: The application is run with `npm run start` and named `hiretrack` for consistency across environments.
- **SSH Security**: Restrict permissions on SSH keys (`chmod 600`) to prevent unauthorized access.
- **Nginx Testing**: Always run `sudo nginx -t` to validate the configuration before reloading Nginx.

For additional support, consult the official documentation for [Nginx](https://nginx.org/), [PM2](https://pm2.keymetrics.io/), or [Node.js](https://nodejs.org/).
