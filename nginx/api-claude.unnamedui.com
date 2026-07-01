server {
    listen 80;
    server_name api-claude.unnamedui.com;

    location / {
        proxy_pass         http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # sudo certbot --nginx -d api-claude.unnamedui.com
}
