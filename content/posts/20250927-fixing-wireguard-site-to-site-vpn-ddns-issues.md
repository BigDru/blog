---
title: "Fixing Wireguard Site to Site VPN DDNS Issues"
date: 2025-09-27
---

## Problem
In my [previous post](/posts/20241120-setting-up-wireguard-site-to-site-vpn/), I setup a site-to-site VPN between my home and my parents' house using WireGuard and dynamic DNS. Everything worked great initially, but I ran into an issue: when the ISP changes the IP address of either location, the WireGuard connection fails and doesn't recover automatically.

The problem is that WireGuard resolves the DDNS hostname (like `<parents_ddns>.ddns.net`) to an IP address when the service starts, and then uses that cached IP address for all subsequent connections. When the ISP changes the IP, WireGuard keeps trying to connect to the old IP address and never re-resolves the hostname.

## Solution
I need a way to monitor when the DDNS hostname resolves to a different IP than what WireGuard is currently using, and restart the WireGuard service when this happens.

The solution is a bash script that:
1. Resolves the current IP for the DDNS hostname
2. Checks if WireGuard is using that IP as an endpoint
3. Restarts WireGuard if the IPs don't match

I put a bash script on each pi at `/home/dru/bin/wireguard-ddns-monitor.sh`:

```bash
#!/bin/bash

# Configuration
WG_INTERFACE="wg0"
DDNS_HOST="<change_this_ddns>.ddns.net"
LOG_FILE="/var/log/wireguard-ddns-monitor.log"
LOCK_FILE="/var/run/wireguard-ddns-monitor.lock"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Prevent multiple instances
if [ -f "$LOCK_FILE" ]; then
    exit 0
fi
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# Get current DNS resolution
current_ip=$(dig +short "$DDNS_HOST" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tail -n1)

if [ -z "$current_ip" ]; then
    log "ERROR: Could not resolve $DDNS_HOST"
    exit 1
fi

# Check if any peer has this IP as endpoint
if ! wg show "$WG_INTERFACE" | grep -q "endpoint.*$current_ip:"; then
    log "IP $current_ip not found in peer endpoints, restarting WireGuard..."
    systemctl restart wg-quick@"$WG_INTERFACE"
    if [ $? -eq 0 ]; then
        log "WireGuard restarted successfully"
    else
        log "ERROR: Failed to restart WireGuard"
    fi
fi
```

The script uses a lock file to prevent multiple instances from running simultaneously, which should never happen but better safe than sorry.

It uses `dig +short` to resolve the DDNS hostname and filters the output to only get IPv4 addresses. Then it checks the WireGuard status to see if any peer is using that IP as an endpoint. If not, it restarts the WireGuard service.

To deploy the script:

```bash
# Install dig if not already available
sudo apt install dnsutils

chmod +x /home/dru/bin/wireguard-ddns-monitor.sh

# 2 min cron job
echo "*/2 * * * * /home/dru/bin/wireguard-ddns-monitor.sh" | sudo crontab -
```

You can monitor the script's activity by checking the log:
```bash
tail -f /var/log/wireguard-ddns-monitor.log
```

Be sure to add a similar script on the other pi!
