#!/bin/sh
# Run only inside the new Debian Steel Computer, never on the local Mac.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Run inside the root-owned Steel Debian computer'; exit 1; }
[ -f /etc/debian_version ] || exit 1
# Preview kernel limitation: systemd-sysusers cannot copy file permissions.
# Pre-create the standard locked service account with Debian's useradd instead.
if [ ! -s /etc/machine-id ]; then tr -d '-' < /proc/sys/kernel/random/uuid > /etc/machine-id; fi
getent group systemd-journal >/dev/null || groupadd --system systemd-journal
id systemd-network >/dev/null 2>&1 || useradd --system --user-group --shell /usr/sbin/nologin --home-dir / systemd-network
id messagebus >/dev/null 2>&1 || useradd --system --user-group --shell /usr/sbin/nologin --home-dir /nonexistent messagebus
apt-get update -qq
packages='nodejs npm ca-certificates'
if [ "${AMMA_INSTALL_BROWSER:-false}" = true ]; then packages="$packages chromium"; fi
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $packages
cat /etc/ssl/certs/ca-certificates.crt /run/steel/egress-ca.crt > /tmp/amma-ca.pem
export NODE_EXTRA_CA_CERTS=/tmp/amma-ca.pem npm_config_cafile=/tmp/amma-ca.pem NPM_CONFIG_CAFILE=/tmp/amma-ca.pem
npm install --prefix /opt/amma-node node@22 --no-audit --no-fund
export PATH="/opt/amma-node/node_modules/node/bin:$PATH"
cd /work/amma
npm ci --no-audit --no-fund
