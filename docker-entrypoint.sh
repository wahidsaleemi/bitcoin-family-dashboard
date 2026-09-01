#!/bin/sh
set -e

# Write nginx config with price API proxy
cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;

    # Static dashboard files
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Serve config from volume
    location = /config.json {
        alias /data/config.json;
        default_type application/json;
        add_header Cache-Control "no-store";
    }

    # Proxy custom price API requests
    location /api/price {
        internal;
        set $price_upstream $price_api_url;
        proxy_pass $price_upstream;
        proxy_set_header Host $price_api_host;
        proxy_set_header X-API-Key $price_api_key;
        proxy_ssl_verify off;
        proxy_read_timeout 10s;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # No cache for HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
NGINX

# Run nginx
exec nginx -g 'daemon off;'
