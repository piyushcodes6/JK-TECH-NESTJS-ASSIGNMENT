# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

# Add Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++ build-base

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build
RUN npm prune --production

# Production Stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy built application from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
