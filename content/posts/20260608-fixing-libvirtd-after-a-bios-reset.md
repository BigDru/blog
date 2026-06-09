---
title: "Fixing libvirtd After a BIOS Reset"
date: 2026-06-08
---

## Problem
My main Arch machine runs a Windows 11 VM with GPU passthrough that I boot up for the occasional game and a few Windows only programs. A few days ago the BIOS on this box got corrupted. I reflashed it to bring the machine back, and while I was in there I added a `linux-lts` rescue entry to the bootloader so I'd have something to fall back on in case of other issues. Everything came back up fine, or so I thought.

Today I went to start the Windows VM and found that Virtual Machine Manager could not connect. `virsh list --all` came back empty and the libvirt daemon was dead:

```text
× libvirtd.service - libvirt legacy monolithic daemon
     Active: failed (Result: start-limit-hit)
    Process: ExecStart=/usr/bin/libvirtd (code=exited, status=243/CREDENTIALS)
```

`start-limit-hit` just means systemd tried to restart it a bunch of times and gave up. The part that actually matters is `status=243/CREDENTIALS`. That's not a libvirt error at all. It's systemd failing to set up the service's credentials, before libvirtd even gets to run a single line.

## Digging In
It turns out libvirt ships a systemd drop-in that I had never once looked at. It lives at `/usr/lib/systemd/system/libvirtd.service.d/10-secret.conf`:

```ini
[Unit]
Requires=virt-secret-init-encryption.service
After=virt-secret-init-encryption.service

[Service]
Environment=SECRETS_ENCRYPTION_KEY=%d/secrets-encryption-key
LoadCredentialEncrypted=secrets-encryption-key:/var/lib/libvirt/secrets/secrets-encryption-key
```

So before libvirtd starts, systemd reads an encrypted file at `/var/lib/libvirt/secrets/secrets-encryption-key`, decrypts it, and passes it into the daemon as a credential. The important word is `LoadCredentialEncrypted`. That file isn't encrypted with a passphrase - it's sealed to my TPM.

The journal spelled it out (this took some back and forth with Claude to fully untangle):

```text
libvirtd.service: Loading HMAC key into TPM for shard 0.
WARNING:esys: Esys_Load_Finish() Received TPM Error
ERROR:esys: Esys_Load() Esys Finish ErrorCode (0x000001df)
libvirtd.service: Key invalid or does not belong to current TPM.
libvirtd.service: TPM key integrity check failed. Key most likely does not belong to this TPM.
libvirtd.service: Failed at step CREDENTIALS spawning /usr/bin/libvirtd: Object is remote
```

"Key most likely does not belong to this TPM." The encrypted file on disk was sealed against my TPM as it existed at some earlier point in time. The TPM doesn't recognize it anymore, so it can't decrypt it, so systemd refuses to start the service.

The timestamp on the file gave away when it was made:

```text
Modify: 2026-06-04 17:44:16
```

June 4th was when I reflashed the BIOS. The key was sealed against the TPM as it was then, the reflash gave me a fresh TPM state, and the key was left pointing at a TPM that effectively no longer exists. Reflashing the firmware is what pulled the rug out.

## What This Key Is Even For
It's how libvirt keeps its *secrets* from sitting on disk as plaintext.

libvirt has a secrets store under `/etc/libvirt/secrets/` where it keeps sensitive values - LUKS passphrases for encrypted disks, Ceph/RBD auth keys, that sort of thing. These used to sit on disk base64 encoded, which is basically plaintext to anyone with root - read the file, read the secret.

So newer libvirt encrypts them with a master key instead. But that just moves the problem: where do you keep the master key? You can't leave *that* in plaintext either. The answer is the TPM - systemd seals the master key to it, and that sealed copy is the `secrets-encryption-key` file. A TPM only gives the key back to the same TPM that sealed it, so copy that file to another machine and it's useless.

The downside is that this quietly makes the TPM a hard dependency for libvirtd starting at all. Wonderful when it works. Less wonderful when the TPM forgets.

## Checking It's Safe to Delete
The fix is to throw away the orphaned key and let libvirt make a fresh one. But before deleting anything I wanted to know what that key was actually protecting. If I had real secrets encrypted under it, deleting it loses them for good.

I didn't:

```text
ls -la /etc/libvirt/secrets/
total 8
drwx------ 2 root root 4096 Mar  1  2024 .
drwxr-xr-x 8 root root 4096 Jun  4 17:03 ..
```

Empty. And my one VM doesn't reference a libvirt secret at all - no encrypted disks, nothing. So the key was protecting exactly nothing. And since it was already impossible to decrypt, anything it *had* been guarding would be gone regardless. Zero downside to deleting it.

## The Fix
There's a companion unit that ships alongside the drop-in, `virt-secret-init-encryption.service`, and its entire job is to generate this key when it's missing. It only runs if the file doesn't already exist (it has a `ConditionPathExists=!...` guard on it, which is why it had been silently skipping every boot). So the fix is just to get the dead key out of the way and let that service regenerate it:

```bash
# stop the sockets so systemd isn't sitting in a restart loop
systemctl stop libvirtd.socket libvirtd-ro.socket libvirtd-admin.socket

# move the orphaned key aside
mv /var/lib/libvirt/secrets/secrets-encryption-key{,.stale.bak}

# clear the failed / start-limit state
systemctl reset-failed libvirtd.service

# and start it back up
systemctl start libvirtd.service
```

It came straight back:

```text
systemctl is-active libvirtd
active

virsh list --all
 Id   Name    State
------------------------
 -    win11   shut off
```

The init service generated a new key, sealed it to the TPM as it is *now*, and libvirtd started clean. My VM was sitting right where I left it. The new key even has a fresh timestamp:

```text
-rw------- 1 root root 596 Jun  8 01:41 secrets-encryption-key
```

## Will This Happen Again?
This is the part I actually cared about. This machine is on a smart switch and I am not always gentle about cutting power to it. So does a power cut bring this whole thing back?

It comes down to what kind of TPM you have. I checked mine:

```text
dmesg | grep -i tpm
tpm_crb MSFT0101:00: Disabling hwrng
ACPI: TPM2 (... AMI ...)
```

That `tpm_crb` / `MSFT0101` is a *firmware* TPM (fTPM), not a discrete chip. There's no physical TPM module on my board - it's emulated by the firmware and its state lives in the BIOS NVRAM / SPI flash. That distinction turns out to be the whole answer:

- A plain power loss does **not** reset the TPM. The fTPM state is non volatile, it survives losing power, and the key on disk stays valid. No recurrence.
- But anything that **wipes or rewrites the BIOS** takes the fTPM with it. That's what actually got me this time - reflashing the firmware to fix the corruption handed me a fresh TPM seed and orphaned the old key. A power loss that corrupts the BIOS, a CMOS clear, or a BIOS update would all do the same.

So a clean power cut is fine. A power cut that scrambles the BIOS is not, and neither is reflashing it, clearing CMOS, or a firmware update that happens to reset the fTPM. A discrete TPM chip would ride all of that out since it keeps its own storage, but I don't have one.

Which means the real fix here isn't really a libvirt fix. It's "stop corrupting the BIOS". My BIOS issue was probably tied to an old CMOS battery and repeated remote power cycles. Having replaced the CMOS, hopefully the BIOS won't reset anymore.

## Notes for the Future
If you don't use libvirt secrets at all, you can just delete the `10-secret.conf` drop-in and drop libvirtd's dependency on the TPM completely. I decided to leave it stock. I'd rather keep a standard libvirt install than carry a custom tweak that some future version of me trips over and has to re-debug from scratch. I'll take the occasional four command recovery over a config nobody else has.
