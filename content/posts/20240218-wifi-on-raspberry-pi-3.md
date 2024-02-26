---
title: "Wifi on Raspberry Pi 3"
date: 2024-02-18T12:57:42-05:00
---

## Problem
Getting wifi working on the Raspberry Pi 3 B+

## Solution
My regular approach is to get things working through wpa_supplicant and dhcpd but the Raspbian lite OS doesn't come with dhcpd installed. So we need to do it with NetworkManager. 

To list all available wifi networks:

```bash
nmcli dev wifi
```

connect to your network:

```bash
nmcli dev wifi connect YourNetworkSSID password YourNetworkPassword
```

Ensure you autoconnect on reboot:

```bash
nmcli con show YourNetworkSSID | grep autoconnect
```

Look for yes on the connection.autoconnect line.
