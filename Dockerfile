# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY split-payment/package*.json ./split-payment/
RUN cd split-payment && npm install --production

# Copy app source
COPY split-payment ./split-payment

# Expose port (default 5000, can be overridden by env)
EXPOSE 5000

# Set environment variables (can be overridden)
ENV NODE_ENV=production

# Start the app
CMD ["node", "split-payment/app.js"]
