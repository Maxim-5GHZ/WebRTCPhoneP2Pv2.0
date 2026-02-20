# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json ./
COPY frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Create the final nginx image
FROM nginx:stable-alpine
# Copy nginx configuration
COPY nginx-docker/conf.d/default.conf /etc/nginx/conf.d/default.conf
# Copy built frontend files
COPY --from=frontend-builder /app/dist /usr/share/nginx/dist
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
