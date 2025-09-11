# File: Dockerfile (in the root of your project)

# --- Stage 1: Build the Frontend ---
# Use an official Node.js image as a builder
FROM node:18-alpine AS frontend-builder

# Set the working directory for the frontend
WORKDIR /app/frontend

# Copy package.json and package-lock.json first to leverage Docker caching
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/ ./

# Build the frontend for production
# This creates a 'dist' folder with optimized static files
RUN npm run build

# --- Stage 2: Setup the Backend ---
# Use a fresh Node.js image for the final, smaller production image
FROM node:18-alpine

# Set the working directory for the backend
WORKDIR /app/backend

# Copy package.json and package-lock.json first
COPY backend/package*.json ./

# Install ONLY production dependencies to keep the image small
RUN npm install --production

# Copy the rest of the backend source code
COPY backend/ ./

# --- Final Step: Combine Frontend and Backend ---
# Copy the built frontend files from the 'frontend-builder' stage
# into a 'public' folder inside the backend directory
COPY --from=frontend-builder /app/frontend/dist /app/backend/public

# Expose the port the app will run on
EXPOSE 3001

# The command to start the backend server when the container launches
CMD ["node", "index.js"]