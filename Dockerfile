# GitOS browser preview in a container.
#
# The desktop app needs a native shell (Tauri) and a display server, so this
# image serves the browser-preview mode: the same React app, with tokens kept
# in memory only (no OS keyring available in a container).
#
# Build:   docker build -t gitos .
# Run:     docker run --rm -p 4173:4173 gitos
# Open:    http://localhost:4173

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
