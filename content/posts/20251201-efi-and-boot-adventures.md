---
title: "EFI and Boot Adventures"
date: 2025-12-01
---

## Problem
I ran out of disk space on my Arch system again. My main system has been running on two SSDs (sdb and sdc) in an LVM configuration, but I have a much faster NVMe drive sitting there with a bunch of old Windows partitions. Since Linux is now my main system, it should be running on the fastest storage I have. Time for a migration.

## Background
My storage situation had become a bit of a mess over time. Here's how things were:

- **sda** - 1.8TB SATA drive split into three partitions. sda1 was huge and held various files, sda2 was a 500GB Windows 11 VM that I run via QEMU with GPU passthrough (IOMMU), and sda3 was unused.
- **sdb & sdc** - Two SSDs in an LVM configuration running my Arch system.
- **sdd & sde** - Two 7.3TB HDDs in a mirrored RAID configuration holding shared files accessible from both Windows and Linux.
- **nvme0n1** - A fast NVMe drive with my original Windows installation that I stopped using years ago.

A few years ago I decided to make Linux my main system. I installed Arch on sdb to test it out and later expanded with sdc for more space. After setting up a Windows 11 VM with GPU passthrough, I stopped dual-booting into Windows entirely. The only exception is League of Legends - that game contains a rootkit-style anti-cheat that doesn't play nice with VMs. I'd prefer to stop playing altogether, but friends keep dragging me back. So I still need a bare metal Windows install for those occasions.

## The Migration
I started by cleaning up sda. I moved files off sda1 and kept it just for Dropbox, then shrunk it down. I deleted sda3 and expanded sda2 (the Windows 11 VM) to 1.1TB. The remaining space at the end of sda would become my new bare metal Windows installation for gaming.

After reorganizing sda, I installed Windows in the new partition, set up the game and Discord, and customized some preferences. Then I deleted the old Windows on the NVMe drive, created new partitions, and dd'd my Linux system over to the fast NVMe storage.

Things were going smoothly up until now. However, the confusion was about to begin.

## The Boot Problem
Half way through my migration I had been asked to play a few games. I said sure and rebooted. However, there was no Windows instance in my rEFInd to be found.

The issue ended up being that when I installed Windows on sda, the installer detected an existing Windows boot loader on the NVMe (from my old Windows installation). Instead of creating its own EFI partition, it registered itself with the existing one. When I deleted the old Windows partitions on the NVMe to make room for Linux, I also deleted the boot configuration that Windows had registered itself with. My system no longer knew how to boot into Windows.

After a lot of confusion and consulting with Claude, the only solution was to manually add the Windows boot entry to the rEFInd partition on the NVMe. Using a Windows USB installation stick, I dropped into the command prompt and ran:

```cmd
diskpart
list vol
select vol <EFI boot volume> // nvme0n1p1
assign letter=S
select vol <windows volume> // sda4
assign letter=C
exit
bcdboot C:\Windows /s S: /f UEFI
```

I didn't need to run the `assign letter=C` because the installation usb detected the windows system and automatically assigned it that letter.

The most important bit was using `bcdboot` to register Windows with the boot manager.
`/s` specifies the target volume letter
`/f` specifies the firmware type

## The rEFInd Confusion
With Windows booting again, I faced another problem: rEFInd was auto-detecting way too many boot options. It found:
- My Windows VM (sda2)
- The bare metal Windows (sda4) but with an Arch logo
- The old rEFInd installation
- The old Linux system on sdb
- The new Linux system on the NVMe

This was a mess. Understanding why required understanding the difference between disks, partitions, and volumes.

### Disks, Partitions, and Volumes
A **disk** is a physical storage device (like `/dev/sda` or `/dev/nvme0n1`). A **partition** is a logical division of a disk - each disk can have multiple partitions that the OS treats as separate storage areas. A **volume** is a higher-level concept - it's a mountable storage unit that can span partitions or even disks (like with LVM or RAID).

Each partition can have a **partition label** (PARTLABEL) stored in the partition table itself (GPT stores these). Filesystems can also have a **filesystem label** (LABEL) stored in the filesystem metadata. These are different things stored in different places - the partition label lives in the disk's partition table, while the filesystem label lives inside the filesystem on that partition.

Here's my current setup:

```
NAME                               SIZE FSTYPE      LABEL    PARTLABEL
sda                                1.8T
├─sda1                             350G ext4
├─sda2                             1.1T                      Win 11 VM
├─sda3                              16M                      Microsoft reserved partition
├─sda4                           372.2G ntfs                 Basic data partition
└─sda5                             742M ntfs
sdb                              111.8G
├─sdb1                             1.9G vfat        OLD_BOOT
└─sdb2                             109G LVM2_member
  └─lvm_vg-root                  339.5G ext4
sdc                              238.5G LVM2_member
├─lvm_vg-swap                        8G swap
└─lvm_vg-root                    339.5G ext4
sdd                                7.3T
├─sdd1                               1M                      LDM metadata partition
├─sdd2                              15M                      Microsoft reserved partition
├─sdd3                             7.3T ntfs        Data     LDM data partition
└─ldm_vol_THEBEAST-Dg0_Volume1     7.3T ntfs        Data
sde                                7.3T
├─sde1                               1M                      LDM metadata partition
├─sde2                             127M
├─sde3                             7.3T ntfs        Data     LDM data partition
└─ldm_vol_THEBEAST-Dg0_Volume1     7.3T ntfs        Data
nvme0n1                          931.5G
├─nvme0n1p1                       1023M vfat        EFI      ESP
└─nvme0n1p2                      930.5G LVM2_member          LVM
  ├─nvme_vg-swap                    16G swap
  └─nvme_vg-root                 914.5G ext4
```

The solution was to use rEFInd's `dont_scan_volumes` directive. This tells rEFInd to ignore specific volumes based on their filesystem label. In `/boot/EFI/refind/refind.conf`:

```
dont_scan_volumes OLD_BOOT,"Win 11 VM"
```

This prevents rEFInd from detecting the old boot partition and the Windows VM as bootable options. I also renamed the old boot partition's label to `OLD_BOOT` to make it clear what it was and easy to exclude.

## The Icon Problem
Even after cleaning up the boot entries, rEFInd was showing the wrong icons. My Arch Linux entry was displaying the generic linux penguin (Tux) instead of the Arch logo.

rEFInd determines icons in a specific order of precedence. It first looks for a `.VolumeIcon.icns` file in the root of the volume. Then it checks for an icon file matching the boot loader name (like `vmlinuz-linux.png`). Finally, it falls back to built-in icons based on OS detection.

I tried creating a `.VolumeIcon.icns` file in my boot partition but rEFInd ignored it. After some investigation, I discovered that rEFInd's icon matching based on loader name actually works reliably. Since my kernel is `vmlinuz-linux`, I copied the Arch logo to `/boot/vmlinuz-linux.png`:

```bash
cp /usr/share/refind/icons/os_arch.png /boot/vmlinuz-linux.png
```

This worked because rEFInd looks for `<loader_name>.png` in the same directory as the loader. When it finds `vmlinuz-linux.png` alongside `vmlinuz-linux`, it uses that as the icon.

## Current State
Everything is now working smoothly:
- Arch boots from the fast NVMe
- Windows boots from sda4 for gaming sessions
- The Windows 11 VM is ignored and can be started up from my Arch host
- rEFInd shows clean options with correct icons

## Next Steps
Now that the bootloader is clean, I still need to:
1. Wipe sdb and sdc completely
2. Create a single LVM volume from both drives for Dropbox storage
3. Move Dropbox from sda1 to the new LVM
4. Expand the Windows 11 VM (sda2) into the freed space on sda
5. Optionally, assign a bit more storage to the bare metal Windows (sda4)
