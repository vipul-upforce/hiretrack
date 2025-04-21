
## Make tar file of project
```tar -czvf hiretrack.tar.gz hiretrack```

## Move tar to VM
```scp hiretrax.tar.gz root@157.245.97.186:/root```

## Go to the vm, go to the hiretrack folder and migrate assset folder to outside, so data can't be loss 
```mv hiretrack/assets .```

## Remove hiretrack
```rm -r  hiretrack```

## Extract tar
```tar -xzvf hiretrax.tar.gz```

## Move asset to hiretrack again 
```mv assets/ hiretrack/```

## Kill pm2 services
```pm2 kill```

## And re run start
```pm2 start "npm run start" --name "hiretrax"```

## Go to the ngix
`cd /etc/nginx/sites-available
ls
default  nextjs-app`

## Write or validate code 
```nano nextjs-app```


## Paste this 
```
server {
    listen 80;
    server_name hire.upforce.tech;
    client_max_body_size 50M;  # Add this line

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


## Restart nginx server
```sudo systemctl reload nginx```
