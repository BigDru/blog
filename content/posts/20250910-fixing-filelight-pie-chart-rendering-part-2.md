---
title: "Fixing Filelight Pie Chart Rendering on KDE - Part 2"
date: 2025-09-10
---

## Problem
I fixed filelight rendering when launching from the menu, however, a good amount of the time I want to launch it from dolphin. I noticed that my ![https://dumbrava.ca/posts/20250910-fixing-filelight-pie-chart-rendering/](fix) did not solve the issue.

## Solution
When running a find on .desktop files we get the following:

```bash
dru@TheArchBeast:~$ sudo find / -name '*.desktop' | grep filelight
find: ‘/run/user/1000/doc’: Permission denied
/var/lib/flatpak/runtime/org.kde.Platform/x86_64/5.15-24.08/ca531f435f2a16f9487cdce9727d7f20c9fd1c489bf89c2a581e3aa47c4772a3/files/share/kf5/kmoretools/presets-kmoretools/org.kde.filelight.desktop
/home/dru/.local/share/applications/org.kde.filelight.desktop
/usr/share/applications/org.kde.filelight.desktop
/usr/share/kio/servicemenus/filelight.desktop
/usr/share/kf5/kmoretools/presets-kmoretools/org.kde.filelight.desktop
```

My solution was to find the `Exec=filelight` line in each of these and insert `env QT_QPA_PLATFORM=xcb` before `filelight` and after `Exec=`

## Result
This worked but I'm worried about the desktop files being overwritten in future updates. Hopefully filelight will work on native wayland soon (as we're now being forced to adopt it).
