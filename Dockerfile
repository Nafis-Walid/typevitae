# Use official lightweight Node.js 22 Debian bookworm image
FROM node:22-bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install TeX Live minimal distribution with required LaTeX packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-pictures \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up app directory
WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Copy core engine, web UI, templates, and data
COPY data/ ./data/
COPY latex_engine/ ./latex_engine/
COPY public/ ./public/
COPY server.mjs ./

# Create build cache directory and ensure permissions
RUN mkdir -p /app/build_cache /app/data/profiles && \
    chown -R 1000:1000 /app

# Hugging Face Spaces runs as user ID 1000 by default
USER 1000

# Default port: 10000 for Render / container hosting
ENV PORT=10000
EXPOSE 10000

# Start TypeVitae server
CMD ["node", "server.mjs"]
