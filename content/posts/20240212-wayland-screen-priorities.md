---
title: "Wayland Screen Priorities not preserved across boots"
date: 2024-02-12T13:38:59-05:00
---

## Problem
I swapped the outputs for my monitors and since then I need to regularly go to Settings > Display and Monitor > Display Configuration > Change Screen Priorities.

![KDE display configuration tool](/images/20240212-wayland-screen-priorities-1.png)

## Solution
I added `xrandr --output DP-2 --primary` to `/usr/share/sddm/scripts/Xsetup`. This didn't seem to help as the `primary` window was still the vertical DP-1 window after reboot. Then I found a solution that seems so bizzare I had to write up a post.

One individual on a forum suggested logging out and then back in to 'save' the settings. Even though it clearly has a radio button to save the configuration on Apply. After doing this and rebooting, the configuration was indeed saved. I'm not sure if the xrandr command helps but I don't think it hurts keeping it in there. It would probably help if i boot into a X11 session instead of Wayland.
