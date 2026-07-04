MAIN=next.config.mjs
MEMORY=1536
VERSION=recommended
DISPLAY_NAME=9Router-Cloud
DESCRIPTION=9Router em 1.5GB de RAM (ClawSec Ninja Build)
SUBDOMAIN=protagrouter
AUTORESTART=true
START=npm run build && node .next/standalone/server.js
