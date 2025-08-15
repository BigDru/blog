---
title: "Permanently Pausing Windows Updates"
date: 2025-08-15
---

## Problem

There's nothing quite as infuriating as setting up a large data transfer over SSH before bed, expecting to wake up to completed files, only to discover that Windows decided 3 AM was the perfect time to force a restart for updates. I learned this the hard way when transferring several gigabytes of project files last night. 

Windows Update's aggressive restart behavior has become increasingly problematic in recent versions. When you're doing serious data management or running long-running processes, this behavior is simply unacceptable.

## Solution

The solution involves modifying the Windows Registry to extend the maximum pause duration for Windows Updates far beyond the default limits. This way I can get my usual linux experience where updates happen when I want them to and I can assume no reboots will happen when I setup long running jobs.

**Warning**: As always when modifying the registry, make sure to backup your system first. Registry changes can affect system stability if done incorrectly. I don't, but I recommend you do. 

### The Registry Modification

Navigate to the following registry key:
```
Computer\HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings
```

You need to create or modify a DWORD value called `FlightSettingsMaxPauseDays` and set it to a very high value. I followed the video guide I found and set it to 1c84 (20 years).

### Why This Works

The `FlightSettingsMaxPauseDays` registry value controls the maximum number of days that Windows Updates can be paused through the Settings app. By default, this is typically limited to 7 or 35 days depending on your Windows edition. 

Setting this to `1c84` (7300 decimal) effectively gives you 20 years of pause capability. While you'll still need to manually pause updates through Windows Settings when needed, you now have the power to keep them paused by default and unpause them when you want to update.

## Results

After implementing this registry change, I can now pause Windows Updates for as long as I want. Yay!. 