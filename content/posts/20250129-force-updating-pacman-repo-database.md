---
title: "Force Updating Pacman Repo Database"
date: 2025-01-29
---

## Problem
This will be a quick post.
If you run arch you will be familiar with `pacman` or `yay`. You subscribe to a mirror and fetch the list of latest packages which then get downloaded and installed onto your computer. The issue I had recently was that my mirror updates its package list once every 4 hours. And by sheer luck the discord package went out of date just after one such update. Discord sometimes makes breaking changes to their package and require you to download the new debian package in order to talk on their servers. This is fine as long as the mirror is aware of the new package. Which in this case it was not. I needed a solution as I did not want to wait 4 hours for my mirror to update.

## Solution
So what I need to do is to switch mirrors temporarily and install the new package. Then switch back.

First I need to get a mirror that is completely synced. You can find a list [here](https://archlinux.org/mirrors/status/#successful). Then I need to add any of those mirrors to the top of my mirror list in `/etc/pacman.d/mirrorlist`.

Once that's done, I need to force pacman to update with `yay -Syy` or `pacman -Syy`

Then I can install my package. In this case: `yay -S discord`

Finally, I want to switch back to my older mirror. This is because it's a very reputable university that manages that mirror and it's very close to my home which means fast downloads.

So go back to the mirrorlist (`/etc/pacman.d/mirrorlist`) and remove the mirror I just added.

Then run `yay -Syy` once more.
