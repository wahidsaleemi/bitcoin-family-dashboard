#!/bin/sh
# Runs automatically via the official nginx image entrypoint
# (/docker-entrypoint.sh executes every /docker-entrypoint.d/*.sh in order
# before starting the server). 00- prefix = runs first, before envsubst.

set -e

# Seed default config.json if none exists (belt-and-braces with the SDK
# init seed — covers volumes restored without config)
if [ ! -f /data/config.json ]; then
    mkdir -p /data
    cat > /data/config.json << 'SEED_EOF'
{
    "title": "Bitcoin Family Dashboard",
    "familyMembers": [
        {
            "name": "Satoshi",
            "avatar": "",
            "btcAmount": 0.125,
            "avgCost": 40000
        }
    ],
    "priceSource": {
        "type": "coinbase",
        "apiUrl": "",
        "apiKey": ""
    },
    "pexels": {
        "enabled": false,
        "apiKey": ""
    },
    "watchOnlyWallets": []
}
SEED_EOF
fi

# Start the watch-only wallet balance helper in the background.
# It reads config.json + env at request time, so it can start before nginx.
if [ -f /opt/wallet-helper/wallet-helper.mjs ]; then
    echo "Starting wallet-helper..."
    node /opt/wallet-helper/wallet-helper.mjs &
fi
