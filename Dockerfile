FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

# Copy upstream static site
COPY bitcoinfamily/ /usr/share/nginx/html/

# Config seeding hook — executed by the official nginx entrypoint
# (which runs every executable /docker-entrypoint.d/*.sh before starting nginx)
COPY --chmod=755 docker-entrypoint.d/ /docker-entrypoint.d/

# Nginx config as a template: the official image envsubst's templates at
# startup, substituting ONLY variables present in the environment
# (${PRICE_UPSTREAM}, ${PRICE_HOST}, ${PEXELS_API_KEY} from main.ts) and
# leaving nginx's own runtime vars ($uri etc.) untouched.
COPY nginx-templates/ /etc/nginx/templates/

# Ensure env vars always exist (empty default) so envsubst never leaves a
# literal ${VAR} in the rendered config when a key isn't configured yet.
ENV PRICE_UPSTREAM="https://api.coinbase.com/v2/prices/BTC-USD/spot" \
    PRICE_HOST="api.coinbase.com" \
    PEXELS_API_KEY=""

EXPOSE 80
