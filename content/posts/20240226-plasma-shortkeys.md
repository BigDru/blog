---
title: "Plasma Global Shortkeys"
date: 2024-02-26T12:26:08-05:00
draft: true
---

## Problem
One of my preferred shortkeys coming from windows is the `Windows + I` key combo. This opens up the system settings. I find it's lacking in default Plasma. Along with this shortkey, I would like to add global shortkeys that open up specific web urls.

## Solution
After some digging I found the shortkey setting to open up the settings. It's located at Workspace > Shortcuts > System Settings > Display Configuration.

![Open Settings Global Shortkey](/images/20240226-plasma-shortkeys-1.png)

In the same menu, I can manually add commands to open up links in my browser.

```bash
firefox https://gmail.com
```

Then I can set their shortkey in the corresponding subsetting window.

![Custom shortkey](/images/20240226-plasma-shortkeys-2.png)

After some more digging I found that these shortkeys are listed in `~/.config/kglobalshortcutsrc`

```bash
[firefox-2.desktop]
_k_friendly_name=firefox https://gmail.com
_launch=Meta+Ctrl+Alt+Shift+G,none,firefox https://gmail.com

[firefox-3.desktop]
_k_friendly_name=firefox https://trade.poe.com
_launch=Meta+Ctrl+Alt+Shift+T,none,firefox https://trade.poe.com

[firefox-4.desktop]
_k_friendly_name=firefox https://avoamps.atlassian.net/jira/software/c/projects/AVO/boards/6
_launch=Meta+Ctrl+Alt+Shift+J,none,firefox https://avoamps.atlassian.net/jira/software/c/projects/AVO/boards/6

[firefox-5.desktop]
_k_friendly_name=firefox https://avoaudio.github.io/
_launch=Meta+Ctrl+Alt+Shift+A,none,firefox https://avoaudio.github.io/

[firefox-6.desktop]
_k_friendly_name=firefox https://calendar.google.com
_launch=Meta+Ctrl+Alt+Shift+C,none,firefox https://calendar.google.com
```

I'm going to keep an active list here for my reference in case I ever need to migrate OSes in the future.
