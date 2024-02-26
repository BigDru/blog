---
title: "Starting tmux over SSH on olimex with kitty term"
date: 2024-02-07T18:39:30-05:00
---

## Problem
I wanted to connect to my olimex from my arch linux desktop. ssh is working nicely but after sshing in I could not tmux as xterm-kitty (my terminal is kitty) is not recognized.
```bash
olimex@a64-olinuxino:~$ tmux
missing or unsuitable terminal: xterm-kitty
```

## Solution
The solution was to set my local arch `TERM` variable to something more universally compatible. ChatGPT suggested xterm-256color. I could do something like this and put together a script in my ~/bin folder:

```bash
#!/bin/bash
export TERM=xterm-256color
ssh olimex
```

This would be my default approach but ChatGPT made the suggestion of putting it in an alias in my `~/.bashrc`. I don't know why, but this is something I never considered. And to be honest, I quite like it. For scripts that are extremely small it makes sense to have an alias instead of a full blown script in my custom bin folder.

## Implementing the Solution
Implementing the solution is as simple as adding this alias to my `~/.bashrc`

```bashrc
alias ssholimex='export TERM=xterm-256color; ssh olimex'
```

For completeness I also added an entry to my `~/.ssh/config` file:
```text
Host olimex
    HostName 192.168.###.###
    User olimex
    SendEnv TERM
```
