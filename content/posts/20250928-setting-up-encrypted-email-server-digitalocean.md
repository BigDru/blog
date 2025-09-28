---
title: "Setting Up an Encrypted Email Server on DigitalOcean"
date: 2025-09-28
---

## Problem
I needed to set up a professional email server for my project that could send emails reliably without ending up in spam folders. Gmail and other major providers have become increasingly strict about email authentication, so a simple SMTP setup just won't cut it anymore.

## Solution
After researching modern email deliverability requirements, I built a complete email server stack using Postfix (SMTP), Dovecot (IMAP), and OpenDKIM on a DigitalOcean droplet with proper DNS authentication records.

### The Email Stack
The core technologies used were:
- **Postfix** - SMTP server for sending/receiving emails
- **Dovecot** - IMAP server for email storage and retrieval
- **OpenDKIM** - Email authentication using cryptographic signatures
- **Let's Encrypt** - SSL/TLS certificates for encryption
- **UFW** - Firewall for security

### DNS Records Setup
The key to modern email deliverability is proper DNS authentication. Here are the essential records:

**Basic Email Records:**
```text
Type: A     | Name: mail.yourdomain.com | Value: <reserved_ip>
Type: MX    | Name: yourdomain.com      | Value: mail.yourdomain.com | Priority: 10
```

**Authentication Records (Critical for Deliverability):**
```text
Type: TXT | Name: yourdomain.com               | Value: v=spf1 mx a:mail.yourdomain.com -all
Type: TXT | Name: _dmarc.yourdomain.com        | Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com
Type: TXT | Name: default._domainkey.yourdomain.com | Value: v=DKIM1; h=sha256; k=rsa; p=<your_generated_public_key>
```

### Why These Records Matter

**SPF (Sender Policy Framework):** Tells receiving servers which IPs are authorized to send email for your domain. The `-all` means reject emails from unauthorized servers.

**DKIM (DomainKeys Identified Mail):** Adds cryptographic signatures to outbound emails. Receiving servers can verify these signatures using your public key in DNS. This is crucial for avoiding spam filters.

**DMARC (Domain-based Message Authentication):** Tells receiving servers what to do when emails fail SPF/DKIM checks. Options are `p=none` (monitor only), `p=quarantine` (send to spam), or `p=reject` (block completely).

### DigitalOcean Reserved IP Challenge
One major gotcha was that DigitalOcean droplets with reserved IPs don't automatically use the reserved IP for outbound traffic. By default, emails were being sent from the internal droplet IP, causing SPF failures. You can read more about this issue in [DigitalOcean's official documentation](https://docs.digitalocean.com/products/networking/reserved-ips/how-to/outbound-traffic/).

The solution was to route outgoing traffic through the reserved it:
1. Get the anchor gateway IP from DigitalOcean metadata
2. Update the default route to use the anchor gateway
3. Make the change persistent in netplan configuration
4. Disable cloud-init network auto-configuration

This ensures outbound emails originate from the reserved IP that matches your DNS records and that these settings persist across droplet reboots.

### Security Hardening
Security is handled by using encryption on the ports used by Dovecot and Postfix. This encryption exists between your email management client and the mail server. Also, UFW was configured to block all traffic except white-listed ports.

### Testing and Verification
After setup, I tested deliverability to Gmail and other major providers. Initially, emails were marked as spam due to missing DKIM signatures. Once all DNS records propagated and DKIM was properly configured, emails were delivered to the inbox with proper authentication indicators.

The complete setup provides a professional email server capable of reliable delivery to major email providers while maintaining strong security and encryption standards.
