---
title: "Display Manager Query"
date: 2024-02-12T13:13:07-05:00
---

## Problem
This one is a short one. I always forget what my display manager is and when i run into issues on my Wayland system I typically will need to search how to find out what display manager I'm using. So this time i'm just going to make a quick post so I 'remember'.

## Solution

```bash
systemctl status display-manager
```

This will spit out the service that's handling display
