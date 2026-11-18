# 非特権 nginx 公式イメージ（nginxinc/nginx-unprivileged は移行済みのため nginx 名前空間を使用）
FROM nginx/nginx-unprivileged:1.28-alpine

COPY deploy/cloud-run/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
COPY deploy/cloud-run/robots.txt /usr/share/nginx/html/robots.txt

EXPOSE 8080
