# 非特権 nginx 公式イメージ（nginx 名前空間。1.28-alpine タグは存在しないため stable-alpine を使用）
FROM nginx/nginx-unprivileged:stable-alpine

COPY deploy/cloud-run/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
COPY deploy/cloud-run/robots.txt /usr/share/nginx/html/robots.txt

EXPOSE 8080
