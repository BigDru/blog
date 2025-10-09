---
title: "Email Deliverability Nightmare: AWS SES and DigitalOcean"
date: 2025-10-09
---

## Problem
After setting up my [email server on DigitalOcean](/posts/20250928-setting-up-encrypted-email-server-digitalocean/), I thought I was done. Turns out I was just getting started on a long journey through email deliverability hell. The issue was that at one point I marked emails from my domain as "Not Spam". So the emails were actually showing up in my inbox. When I tried on another email address, they went straight to spam.

### The PTR Record Problem
I found a website [mail-tester.com](https://www.mail-tester.com/) that lets you send emails to them and they diagnose how spammy it is and tell you why. It was there that I discovered the PTR problem.

PTR (Pointer) records are reverse DNS lookups - they map an IP address back to a domain name. Email providers use PTR records to verify that the server sending email actually belongs to the domain it claims to be from. It's one of the basic anti-spam checks, but I didn't know about it in the last post.

DigitalOcean has a quirk with reserved IPs and PTR records. When you assign a reserved IP to a droplet, you can't point the PTR record to that reserved IP. Instead, the PTR record automatically points to the droplet's dynamic IP that changes across reboots.

This is a massive problem for email deliverability. Gmail and other providers check if your PTR record matches your sending IP. If it doesn't match, your emails get rejected or sent to spam. My emails were being sent from the reserved ip but the owner according to the PTR record (rDNS) was not the same. It was the dynamic ip instead.

The only workaround is to manually update DNS records after every reboot, which would cause downtime and email rejections during propagation.

After some research, I decided this was manageable. DNS records propagate fairly quickly, and the IPs assigned to droplets tend to stay the same until a reboot. Since reboots only happen manually and very rarely, I could live with this limitation.

So I abandoned the reserved ip and dropped to manually changing DNS records after reboots.

### The Real Problem: DigitalOcean IP Ranges
With the PTR record issue somewhat resolved, I tested sending emails. They sent successfully to my test accounts, but then I noticed something disturbing: **every single email went straight to spam** for accounts that hadn't manually marked previous emails as "Not Spam."

After testing with multiple Gmail accounts, digging through logs, and then searching the web for answers, I discovered the truth: **all IP ranges from DigitalOcean are marked as spam by default by Gmail and probably other major providers.**

Why? Because it's reasonably easy for spammers to spin up a DigitalOcean droplet, configure an email server, and start blasting spam. Gmail learned this pattern and now treats all DigitalOcean IPs as guilty until proven innocent.

No amount of SPF, DKIM, and DMARC configuration was going to fix this. The IP range itself was poisoned.

## Solution

### The Options
I had two choices:

**Option 1: Home Static IP**

I could convert my home internet to business internet and get a static IP, then run the email server from home. This would work since these static IPs aren't flagged as cloud provider IPs.

My issue with this solution is the cost. Going this route would **3x-4x** my current monthly internet bill. In Canada, the internet is NOT cheap. For a project that hasn't launched yet, this cost cannot be justified.

**Option 2: SMTP Relay Service**

Use a third-party SMTP relay service that has already built up reputation with email providers. These services handle the actual sending of emails through their verified infrastructure.

I decided to go with option 2.

### The AWS SES Experience
I decided to try AWS SES (Simple Email Service). I had an AWS account from some AI training I did over 2 years ago, so I figured this would be straightforward.

I spent a day setting everything up:
- Added SES to my account
- Configured DNS records (more DKIM keys, TXT records, etc.)
- Verified my domain
- Build up my docker infrastructure to relay emails to aws
- Tested sending to verified email addresses (worked perfectly)
- Wrote a highly detailed description of my use case for their review team

AWS requires manual approval to move from "sandbox mode" (can only send to verified emails) to "production mode" (can send to anyone). They claim reviews take less than 24 hours.

**36 Hours Later**

I got an email: **Request Denied.**

No explanation. No specific reasons. Just a generic "we've decided not to grant you access" message.

I immediately went online to research why this happens. Turns out I wasn't alone - dozens of posts from the past few months with developers having identical experiences. Apparantely, there was an auto-approve system in place that was recently revised. Spammers could easily create new aws accounts and tarnish the SES ip pool reputation. Because of this it seems that AWS is now being much more strict. Some people suggested applying again. Others said they fought with AWS support daily for up to **two weeks** trying to get approval. AND they were spending 10k a month on other AWS services.

I don't have two weeks to waste on getting email working. I need to build my email list now. I need to send transactional emails to users now.

### Switching to an Alternative
I switched to an alternative SMTP relay provider. Setup took maybe 30 minutes:
- Created account
- Added API credentials to my configuration
- Updated DNS records (again)
- Tested deliverability

Emails started hitting inboxes immediately. Not spam folders - actual inboxes. With all the proper authentication indicators. In a real production environment.

### Lessons Learned
1. **Cloud provider IPs are toxic for email.** Don't even try to send directly DigitalOcean, or any other major cloud provider. Their IP ranges are generally burned.

2. **AWS SES approval is a black box.** Even with a 2-year-old account and a legitimate business use case, you can get rejected with zero explanation.

3. **SMTP relay services exist for a reason.** They've already done the hard work of building sender reputation. Pay for that instead of trying to DIY it from a cloud IP.

4. **The PTR record problem is real but manageable.** If you must self-host, use a provider that lets you control PTR records for reserved IPs, or accept the risk of manual DNS updates after reboots.

The frustrating part is how much time I wasted on getting something as simple as email to work properly.

Hopefully this post will help others save time on setting up email. Just go with an SES alternative right from the start!
