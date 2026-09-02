FROM nginx:alpine

# Node.js for the watch-only wallet helper (server-side descriptor derivation)
RUN apk add --no-cache nodejs npm

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy upstream static site
COPY bitcoinfamily/ /usr/share/nginx/html/

# Config seeding hook — executed by the official nginx entrypoint
# (which runs every executable /docker-entrypoint.d/*.sh before starting nginx)
COPY --chmod=755 docker-entrypoint.d/ /docker-entrypoint.d/

# Watch-only wallet helper (descriptor -> addresses -> balance)
WORKDIR /opt/wallet-helper
COPY wallet-helper.mjs /opt/wallet-helper/wallet-helper.mjs
COPY package-helper.json /opt/wallet-helper/package.json
RUN npm install --omit=dev --no-audit --no-fund
WORKDIR /

# Nginx config as a template: the official image envsubst's templates at
# startup, substituting ONLY variables present in the environment
# (${PRICE_UPSTREAM}, ${PRICE_HOST}, ${PEXELS_API_KEY}, ${BITCOIND_RPC} from
# main.ts) and leaving nginx's own runtime vars ($uri etc.) untouched.
COPY nginx-templates/ /etc/nginx/templates/

# Ensure env vars always exist (empty default) so envsubst never leaves a
# literal ${VAR} in the rendered config when a key isn't configured yet.
ENV PRICE_UPSTREAM="https://api.exchange.coinbase.com/products/BTC-USD/ticker" \
    PRICE_HOST="api.exchange.coinbase.com" \
    PEXELS_API_KEY="" \
    BITCOIND_RPC=""

EXPOSE 80
