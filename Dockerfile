# Build Stage: Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ARG VITE_BASE44_APP_ID
ENV VITE_BASE44_APP_ID=$VITE_BASE44_APP_ID
RUN npm run build
RUN ls -la /app/frontend

# Runtime Stage: Python Backend
FROM python:3.9-slim

# Install system dependencies (for OpenCV/ML)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ ./backend/
# Copy built frontend assets from build stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose port (Render sets PORT env)
ENV PORT=8000
EXPOSE $PORT

# Run
CMD ["sh", "-c", "cd backend && uvicorn app_improved:app --host 0.0.0.0 --port $PORT"]
