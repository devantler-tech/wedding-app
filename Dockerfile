# The Node major here is declared in .node-version; scripts/node-toolchain-contract.test.sh fails CI
# when the two disagree, so bump both together (#343).
# Both stages pin the image by digest as well as tag, so every build of a commit uses the same image
# and Dependabot proposes each rebuilt node:26-alpine as a reviewed update that cuts a release (#423).
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# 127.0.0.1, not localhost: inside the image localhost resolves to ::1 first, and the server
# listens on IPv4 only, so the old check was refused and never reported healthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["sh", "-c", "wget -q -t 1 --spider http://127.0.0.1:3000/login || exit 1"]
# The node image's `node` user, by number so Kubernetes can verify runAsNonRoot.
USER 1000
CMD ["node", "build/index.js"]
