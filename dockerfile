FROM nginx:alpine

# Remove default Nginx config and default webpage assets
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/nginx.conf

# Copy your custom Gzip configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Safely copy your entire folder structure (respecting your .dockerignore)
COPY . /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

