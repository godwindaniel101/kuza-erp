# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy i18n files
COPY --from=builder /app/src/i18n ./dist/i18n

# Copy email templates to both locations (for compatibility)
COPY --from=builder /app/src/modules/notifications/templates ./src/modules/notifications/templates
COPY --from=builder /app/src/modules/notifications/templates ./templates

# Create uploads directory for images
RUN mkdir -p uploads/inventory

# Expose port
EXPOSE 4001

# Start application
CMD ["node", "dist/main.js"]

