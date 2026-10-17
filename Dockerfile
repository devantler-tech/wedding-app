# The Node major here is declared in .node-version; scripts/node-toolchain-contract.test.sh fails CI
# when the two disagree, so bump both together (#343).
# Both stages pin the image by digest as well as tag, so every build of a commit uses the same image
# and Dependabot proposes each rebuilt node:26-alpine as a reviewed update that cuts a release (#423).
FROM node:26-alpine@sha256:6f08a523443ddedf52941874c203475b0ad503e859ad70cb26ab8be9a517dbd5 AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:26-alpine@sha256:6f08a523443ddedf52941874c203475b0ad503e859ad70cb26ab8be9a517dbd5
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -t 1 --spider http://localhost:3000/login || exit 1
USER node
CMD ["node", "build/index.js"]
