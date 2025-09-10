---
title: "Fixing Filelight Pie Chart Rendering on KDE"
date: 2025-09-10
---

## Problem
Recently Filelight hasn't been displaying pie chart visualization. Instead it showed a blank gray background. This makes the program almost unusable. Here we fix it.

## Solution
Below you can see how it is rendered:
![Broken Filelight rendering](/images/20250910-fixing-filelight-1.png)

To fix this we need to set an environment variable for Filelight using KDE Menu Editor. I just learned this tool existed! It's a handy way to modify application launch parameters without editing desktop files manually.

First, search for "filelight" in the top left of KDE Menu Editor, then add `QT_QPA_PLATFORM=xcb` to the Environment variables section:

![KDE Menu Editor with environment variable](/images/20250910-fixing-filelight-2.png)

Save the settings using the Save button in the top right.

This variable tells Qt to use the X11 backend for drawing the window instead of wayland.

## Result
After applying this change, Filelight's pie chart renders perfectly:

![Working Filelight pie chart](/images/20250910-fixing-filelight-3.png)
