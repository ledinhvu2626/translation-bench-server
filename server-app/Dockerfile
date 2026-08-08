FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./
COPY public ./public
COPY data ./data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
