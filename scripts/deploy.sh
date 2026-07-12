#!/usr/bin/env bash
# Factory Inventory LAN deployment (bare node + systemd + nginx)
# Target: Debian 13, xu@192.168.31.191
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.."; pwd)"
REMOTE="${REMOTE:-xu@192.168.31.191}"
DIR="${DIR:-/opt/factory-inventory}"
SUDOPASS="${SUDOPASS:-}"

# --- SSH transport (password via sshpass if available, else key auth) ---
: "${SSHPASS:=}"
if [[ -z "$SSHPASS" && -f "$ROOT/.deploy-password" ]]; then
  SSHPASS="$(cat "$ROOT/.deploy-password")"
fi
if [[ -n "$SSHPASS" ]]; then
  export SSHPASS
  # Locate sshpass (may live outside PATH, e.g. ~/bin on a fresh machine)
  if ! command -v sshpass >/dev/null 2>&1; then
    for cand in /Users/xu/bin/sshpass /usr/local/bin/sshpass /opt/homebrew/bin/sshpass /usr/bin/sshpass; do
      [[ -x "$cand" ]] && SSHPASS_BIN="$cand" && break
    done
    if [[ -z "${SSHPASS_BIN:-}" ]]; then
      echo "ERROR: sshpass not found in PATH or known locations" >&2
      exit 1
    fi
  else
    SSHPASS_BIN="$(command -v sshpass)"
  fi
  SSH=("$SSHPASS_BIN" -e ssh -o StrictHostKeyChecking=accept-new)
  SCP=("$SSHPASS_BIN" -e scp -o StrictHostKeyChecking=accept-new)
else
  SSH=(ssh -o StrictHostKeyChecking=accept-new)
  SCP=(scp -o StrictHostKeyChecking=accept-new)
fi

# Run a command on the remote with sudo. Echoes sudo password if provided.
# Wraps the whole command in `bash -c '...'` so all chained `&&` segments
# inherit the elevated privileges (otherwise only the first segment runs as root).
# Uses printf %q to safely quote the user's command through nested shells.
remote_sudo() {
  local quoted
  quoted=$(printf '%q' "$*")
  if [[ -n "$SUDOPASS" ]]; then
    "${SSH[@]}" "$REMOTE" "printf '%s\n' '$SUDOPASS' | sudo -S -p '' bash -c $quoted"
  else
    "${SSH[@]}" "$REMOTE" "sudo bash -c $quoted"
  fi
}

echo "==> Building frontend"
( cd "$ROOT" && npm install --no-audit --no-fund && npm run build )

echo "==> Building backend"
( cd "$ROOT/server" && npm install --no-audit --no-fund && npm run build )

TMP=$(mktemp -d)
mkdir -p "$TMP/deploy"

echo "==> Staging deploy bundle"
cp -r "$ROOT/dist" "$TMP/deploy/web"
mkdir -p "$TMP/deploy/api"
cp -r "$ROOT/server/dist" "$TMP/deploy/api/dist"
cp -r "$ROOT/server/migrations" "$TMP/deploy/api/migrations"
mkdir -p "$TMP/deploy/api/data"
cp "$ROOT/server/package.json" "$TMP/deploy/api/package.json"

# nginx site config (port 8080, /api/ → 127.0.0.1:4000)
cat > "$TMP/deploy/nginx-site.conf" <<'NGINX'
server {
  listen 8080 default_server;
  listen [::]:8080 default_server;
  server_name _;

  root /opt/factory-inventory/web;
  index index.html;

  client_max_body_size 10m;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API reverse proxy to local node process
  location /api/ {
    proxy_pass http://127.0.0.1:4000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass_header Set-Cookie;
    proxy_buffering off;
  }

  # Static asset cache
  location ~* \.(js|css|svg|png|jpg|jpeg|webp|woff2?|ico)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
NGINX

# systemd unit (runs node API as xu)
cat > "$TMP/deploy/factory-inventory-api.service" <<'UNIT'
[Unit]
Description=Factory Inventory API
After=network.target

[Service]
Type=simple
User=xu
WorkingDirectory=/opt/factory-inventory/api
EnvironmentFile=/opt/factory-inventory/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
UNIT

echo "==> Uploading to $REMOTE:$DIR"
remote_sudo "mkdir -p $DIR && chown xu:xu $DIR && chmod 755 $DIR"
tar czf - -C "$TMP/deploy" . | "${SSH[@]}" "$REMOTE" "tar xzf - -C $DIR && find $DIR -name '._*' -delete"
remote_sudo "chown -R xu:xu $DIR"

echo "==> Installing production node_modules on target"
"${SSH[@]}" "$REMOTE" "cd $DIR/api && npm install --omit=dev --no-audit --no-fund"

if "${SSH[@]}" "$REMOTE" "[ -f $DIR/.env ]"; then
  echo "==> .env already exists on server, keeping it"
else
  echo "==> Creating .env on server with random JWT_SECRET"
  cp "$ROOT/.env.example" "$TMP/deploy/.env"
  SECRET=$(openssl rand -hex 32)
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" "$TMP/deploy/.env"
  rm -f "$TMP/deploy/.env.bak"
  "${SCP[@]}" "$TMP/deploy/.env" "$REMOTE:$DIR/.env"
  "${SSH[@]}" "$REMOTE" "chmod 600 $DIR/.env"
fi

echo "==> Installing systemd unit + nginx site"
remote_sudo "cp $DIR/factory-inventory-api.service /etc/systemd/system/factory-inventory-api.service && systemctl daemon-reload && systemctl enable --now factory-inventory-api"
remote_sudo "cp $DIR/nginx-site.conf /etc/nginx/sites-available/factory-inventory && ln -sf /etc/nginx/sites-available/factory-inventory /etc/nginx/sites-enabled/factory-inventory && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx"

rm -rf "$TMP"
echo ""
echo "✓ Deployed to http://192.168.31.191:8080"
echo "  Default login: admin / admin123  (or operator / operator123)"
echo ""
echo "  Useful commands:"
echo "    ssh $REMOTE 'systemctl status factory-inventory-api'"
echo "    ssh $REMOTE 'journalctl -u factory-inventory-api -f'"
echo "    ssh $REMOTE 'systemctl reload nginx'"