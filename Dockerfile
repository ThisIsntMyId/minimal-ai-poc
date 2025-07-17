FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy everything
COPY server/ ./
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "index.js"]