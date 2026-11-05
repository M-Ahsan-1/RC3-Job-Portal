FROM node:20-alpine

WORKDIR /app

# copy package files first so docker caches the npm install layer
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# uploads land here, compose mounts a volume on it so resumes survive restarts
RUN mkdir -p /app/uploads
ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

EXPOSE 3000

# change this if Sameer's entry file ends up somewhere else
CMD ["node", "src/server.js"]
