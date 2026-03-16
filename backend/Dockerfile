FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Cloud Run sets PORT env var automatically)
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
