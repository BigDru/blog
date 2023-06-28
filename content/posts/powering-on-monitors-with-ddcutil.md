---
title: "Powering on Monitors with ddcutil"
date: 2023-05-01T20:32:55-04:00
---

## Problem
I have 4 monitors. Two of them are ASUS monitors (VS239) that are stacked one above the other on my left side. The issue I’m having is that these two monitors don’t wakeup when I power on my computer.

## Exploration
Let’s begin by asking ChatGPT for a solution. It recommended I use `ddcutil`. The rest of the recommendations didn’t work too well but it gave us a nice starting point.

First let’s install `ddcutil`:

```bash
sudo pacman -S ddcutil
```

Then let’s try to detect the screens:

```bash
sudo ddcutil detect
```

An error came up saying ddcutil needs the i2c-dev module to work. So let’s enabled it:

```bash
sudo modprobe i2c-dev
sudo ddcutil detect
```

Then we get the following output:

```text
Display 1
I2C bus: /dev/i2c-4
DRM connector: card0-DP-3
EDID synopsis:
Mfg id: HWP - Hewlett Packard
Model: HP E231
Product code: 12387 (0x3063)
Serial number: 3CQ42519HV
Binary serial number: 16843009 (0x01010101)
Manufacture year: 2014, Week: 25
VCP version: 2.2

Display 2
I2C bus: /dev/i2c-7
DRM connector: card0-HDMI-A-2
EDID synopsis:
Mfg id: ACI - Ancor Communications Inc
Model: ASUS VS239
Product code: 9170 (0x23d2)
Serial number: DCLMTF166938
Binary serial number: 166938 (0x00028c1a)
Manufacture year: 2013, Week: 51
VCP version: 2.1

Display 3
I2C bus: /dev/i2c-10
DRM connector: card0-DP-2
EDID synopsis:
Mfg id: ACR - Acer Technologies
Model: XB271HU
Product code: 1168 (0x0490)
Serial number: #ASNjZfyWiDXd
Binary serial number: 72366061 (0x045037ed)
Manufacture year: 2020, Week: 45
VCP version: 2.2

Display 4
I2C bus: /dev/i2c-11
DRM connector: card0-HDMI-A-1
EDID synopsis:
Mfg id: ACI - Ancor Communications Inc
Model: ASUS VS239
Product code: 9170 (0x23d2)
Serial number: K6LMTF053243
Binary serial number: 53243 (0x0000cffb)
Manufacture year: 2019, Week: 24
VCP version: 2.1

Display 5
I2C bus: /dev/i2c-18
DRM connector: card0-DP-2
EDID synopsis:
Mfg id: ACR - Acer Technologies
Model: XB271HU
Product code: 1168 (0x0490)
Serial number: #ASNjZfyWiDXd
Binary serial number: 72366061 (0x045037ed)
Manufacture year: 2020, Week: 45
VCP version: 2.2

Display 6
I2C bus: /dev/i2c-19
DRM connector: card0-DP-3
EDID synopsis:
Mfg id: HWP - Hewlett Packard
Model: HP E231
Product code: 12387 (0x3063)
Serial number: 3CQ42519HV
Binary serial number: 16843009 (0x01010101)
Manufacture year: 2014, Week: 25
VCP version: 2.2
```

This was very interesting since I only have 4 monitors (not 6). My main monitor is the XB271HU (Display 3 & 5). My HP monitor is in a portrait position on the right (Display 1 & 6). And the remaining two monitors are the ASUS monitors that won’t turn on. If anyone knows why the XB271HU and the HP monitor have duplicate entries I’d be interested to know (comment below).

Next we need to figure out the available VCP codes. VCP = Virtual Control Panel and it’s a “feature code” that is used to get or set information from (what I’m guessing) is the monitor’s internal memory registers. Considering we needed to activate a i2c-dev module to run commands via ddcutil, I assume we are somehow talking directly to the microcontroller over I2C.

To select the specific monitor we can use a variety of options (viewable via `ddcutil --help`). I decided to use the ASCII serial number:

```bash
sudo ddcutil -n DCLMTF166938 getvcp known
```

The output is as follows:

```text
VCP code 0x02 (New control value ): One or more new control values have been saved (0x02)
VCP code 0x0b (Color temperature increment ): 50 degree(s) Kelvin
VCP code 0x0c (Color temperature request ): 3000 + 70 * (feature 0B color temp increment) degree(s) Kelvin
VCP code 0x10 (Brightness ): current value = 60, max value = 100
VCP code 0x12 (Contrast ): current value = 80, max value = 100
VCP code 0x14 (Select color preset ): User 1 (sl=0x0b)
VCP code 0x16 (Video gain: Red ): current value = 100, max value = 100
VCP code 0x18 (Video gain: Green ): current value = 100, max value = 100
VCP code 0x1a (Video gain: Blue ): current value = 100, max value = 100
VCP code 0x52 (Active control ): Value: 0x00
VCP code 0x60 (Input Source ): HDMI-1 (sl=0x11)
VCP code 0x62 (Audio speaker volume ): current value = 50, max value = 100
VCP code 0x6c (Video black level: Red ): current value = 50, max value = 100
VCP code 0x6e (Video black level: Green ): current value = 50, max value = 100
VCP code 0x70 (Video black level: Blue ): current value = 50, max value = 100
VCP code 0x8d (Audio Mute ): Unmute the audio (sl=0x02)
VCP code 0xac (Horizontal frequency ): 1364 hz
VCP code 0xae (Vertical frequency ): 59.50 hz
VCP code 0xb2 (Flat panel sub-pixel layout ): Red/Green/Blue vertical stripe (sl=0x01)
VCP code 0xb6 (Display technology type ): LCD (active matrix) (sl=0x03)
VCP code 0xc0 (Display usage time ): Usage time (hours) = 62031 (0x00f24f) mh=0xff, ml=0xff, sh=0xf2, sl=0x4f
VCP code 0xc6 (Application enable key ): 0x006f
VCP code 0xc8 (Display controller type ): Mfg: Novatek (sl=0x12), controller number: mh=0xff, ml=0xff, sh=0x00
VCP code 0xc9 (Display firmware level ): 0.2
VCP code 0xca (OSD ): OSD Enabled (sl=0x02)
VCP code 0xcc (OSD Language ): English (sl=0x02)
VCP code 0xd6 (Power mode ): DPM: Off, DPMS: Standby (sl=0x02)
VCP code 0xdc (Display Mode ): User defined (sl=0x04)
VCP code 0xdf (VCP Version ): 2.1
```

The VCP code of interest is 0xd6. I couldn’t find a command to tell me what values are acceptible for this register so I asked chatGPT. It was convinced 0x01 was the value needed to bring the monitor to an ON state. So I gave it a try and it worked!

## Solution

Now that we have all the pieces so let’s put it all together. First I made a bash script that I can run as sudo to power on the monitors whenever I want:

```bash {linenos=table}
#!/bin/bash
modprobe i2c-dev

ddcutil -n DCLMTF166938 setvcp 0xd6 0x01
ddcutil -n K6LMTF053243 setvcp 0xd6 0x01
```

Running this script powers on my monitors as intended. ChatGPT suggested adding a line `i2c-dev to /etc/modules-load.d/modules.conf` to ensure the module is loaded on boot, but if I ever change my monitors, I won’t need that module anymore. I fear that I will forget about it and unnecessarily bloat my computer. So I’m content with loading the module only inside the script.

The final part is to call the script when the computer boots. Let’s create a service file at `/etc/systemd/system/start-asus-monitors.service`:

```service {linenos=table}
[Unit]
Description=Wake up ASUS monitors on boot

[Service]
Type=oneshot
ExecStart=/bin/bash /home/dru/bin/start_asus_monitors.sh

[Install]
WantedBy=default.target
```

And enable it:

```bash
sudo systemctl enable start-asus-monitors
```

Reboot to test and we're done!

## Notes for the future

I tried setting up an additional service that triggers after `sleep.target` but it would wake up my computer immediately after I put it to sleep and then leave the computer in an unstable state. In the future, it would be nice if I could figure out a way to trigger the script when the desktop loads / becomes visible (on boot and on wakeup). This would allow me to wake up the monitors automatically even if I put the computer to sleep. For now I’ll settle with calling the shell script we created earlier. If you have any ideas for how to approach this problem feel free to comment below!
