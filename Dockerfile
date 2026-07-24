# Build the SPA, then hand the bundle to Flask. One image, one process.
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
EXPOSE 8000
# Render injects PORT; locally default to 8000.
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:${PORT:-8000} -w 2 wsgi:app"]
