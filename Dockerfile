FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4173
ENV HOST=0.0.0.0 PORT=4173 PAYPAL_MODE=replay DATABASE_PATH=/app/data/recallrelay.sqlite
CMD ["npm","start"]
