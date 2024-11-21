---
title: "Setting Up Wireguard Site to Site VPN"
date: 2024-11-20
---

## Problem
I want to connect my home and my parents' house. For the time being I only need to access resources on their network. The best solution for this is to use a site-to-site vpn and use masquerading to facilitate communication on their network.

## Solution
To solve this I need dynamic dns setup and two pis connected via ethernet to the router at each house.

### DDNS
First I need to be able to get the ip address for either house from anywhere in the world. We don't have a static IP so I need a dynamic DNS solution. I registered for an account with no-ip and registered a couple of hostnames for both locations. I then configured both routers (which are actually the same router) to update no-ip with the ip on the regular. My router is a Giga Hub 4000. These settings were found in `Advanced tools and settings > Networking > DDNS (Dynamic DNS)`. I selected NoIP as the provider and used the information provided on the noip website. Setup was quite simple. Just follow the steps on noip.com.

### Parent's pi
I need to install wireguard and create the config. I also installed iperf3 to test the connection later.

```bash
sudo apt update; sudo apt install wireguard iperf3
```

The `/etc/wireguard/wg0.conf` is as follows:
```conf
[Interface]
PrivateKey = <parents_private_key>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
#Home
PublicKey = <home_public_key>
Endpoint = <home_ddns>.ddns.net:51820
AllowedIPs = 10.0.0.2/32

[Peer]
#Mom mobile
PublicKey = <mom_mobile_public_key>
AllowedIPs = 10.0.0.4/32

[Peer]
#My mobile
PublicKey = <my_mobile_public_key>
AllowedIPs = 10.0.0.5/32
```

For the port I am using the default port `51820`.
The Home peer allows connections only to and from `10.0.0.2/32` using `<home_public_key>`. Each peer will always have their own private/public key pair used for authentication into the network so traffic to each peer needs to be limited to each peer's ip on the `10.0.0.x/24` subnet. I'm using /32 to ensure traffic meant for `10.0.0.4` doesn't go to `10.0.0.2`.

Additionally, I don't need to include the `<home_lan>.x/24` subnet as an allowed IP as any traffic that reaches my parents' home pi will come from the wireguard tunnel and have its source address set to `10.0.0.2`.

If you're unfamiliar with the /24 or /32 notation it basically tells you how many bits are set in the network bitmask. So /24 means `255.255.255.0` and /32 would mean `255.255.255.255`.

Next I need to enable IP forwarding. `ipv4.ip_forward` allows the pis to act as routers between networks and forward traffic from the lan network it's attached to to the wireguard network (`10.0.0.0/24`) and vice versa. Forwarding will need to be enabled on both pis. The second line below ensures forwarding is enabled across reboots.
```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

Now it's time for a ball! Masquerading only needs to be set up on the pi at my parents' home. This is because, for the moment, I only need to access resources on their network. In the future I will add a backup server on my network and they will need to be able to access that from their network. However, at that point, static routes would be setup on their network anyways. So masquerading traffic from my network would not make any sense. All devices on their network would know to send traffic destined for my network to their pi. (Side note: masquerading would still be needed in that scenario as there are other devices (like mobile phones) that are connecting from different networks and replies would need to be sent to a known route).

Masquerading will be handled via ip tables. Install if it's not already installed:
```bash
sudo apt install iptables
```

And add the rule:
```bash
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

Here we're using nat POSTROUTING as that is how we modify the source address of the packet.

`-t nat` NAT table\
`-A POSTROUTING` append POSTROUTING rule\
`-s 10.0.0.0/24` any traffic from the `10.0.0.x/24` network\
`-o eth0` traffic exiting eth0\
`-j MASQUERADE` specifies the target if a match is found is to masquerade the ip (change the source address). Note: `-j` stands for `--jump`

We can view the configuration by using the following command:
```bash
sudo iptables -t nat -L -v
```

`-L, --list`\
`-v, --verbose`

When running this command you should see the POSTROUTING rule we setup earlier.

Finally, to ensure we keep the configuration across reboots we need to install `iptables-persistent`
```bash
sudo apt install iptables-persistent
```

During install it will ask if you want to save the current rules. Select yes.

If you selected no, this shell command below will save your current iptables rules:
```bash
sudo sh -c "iptables-save > /etc/iptables/rules.v4"
```

Next I need to enable the wireguard service for wg0 interface I just configured:
```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

You can then check the ip routing tables with
```bash
ip route
```

You should see wg0 among the entries.

You can also check wireguard status by executing

```bash
sudo wg show
```

Finally, I need to setup a port forwarding rule on the router. I found these settings at `Advanced tools and Settings > Networking > Port Forwarding`

Then I created a new rule using UDP that forwarded the internal `51820` port to the `51820` port on my pi. Save and activate and we're done!

### Home pi
Next, I need a similar config at my home. I installed wireguard and iperf3 on this pi as well.

The `wg0.conf` is as follows:
```conf
[Interface]
PrivateKey = <home_private_key>
Address = 10.0.0.2/24
ListenPort = 51820

[Peer]
PublicKey = <parents_public_key>
Endpoint = <parents_ddns>.ddns.net:51820
AllowedIPs = 10.0.0.1/32
```

Enable IP forwarding
```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

And start the interface
```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

### Manual static routing
Unfortunately, my router does not provide options to setup a static route to my parent's network. I either have to manually add routes to each computer or find some other way of doing it indirectly.

To add a route on Linux through Network Manager you can do some scripting with `nmcli connection modify` and modify the routes field but I opted to use the GUI this time.

Clicking on my wired connection I clicked configure which brought up the Plasma Settings window. Then I clicked on IPv4 and the `Routes...` button at the bottom right. I then added a route to the pi in my home network and clicked Ok and Apply

On Windows you should be able to run the following command in a administrator command prompt:
```batch
route -p add <parents_lan> mask 255.255.255.0 x.x.x.253
```

The `-p` makes it persistent across reboots

To delete the route you would do:
```batch
route delete <parents_lan>
```

### Working out the bugs
When testing it out, it doesn't work!

But how could that be? The logic is flawless!! Well, when it doesn't work, the logic is flawed.

We can do a lot of debugging with tcpdump commands.
```bash
sudo tcpdump -nvi wg0 | grep ICMP
```

`-n` forces names not to be resolved so I can see the raw ip addresses
`-v` is for verbose
`-i` specifies the interface
`host <host>` specifies an ip address to focus on

Even without the grep we don't see any traffic on wg0.

After some research it turns out that the issue is that the pi has no idea where to send the traffic. `ip route` doesn't show any rules for traffic destined for my `parents_lan` network. Adding an entry for that network to the allowed ips in the `wg0.conf` would result in a new route being added to the routing table and traffic being redirected.

I've updated the `wg0.conf` to the following:
```bash
[Interface]
PrivateKey = <home_private_key>
Address = 10.0.0.2/24
ListenPort = 51820

[Peer]
PublicKey = <parents_public_key>
Endpoint = <parents_ddns>.ddns.net:51820
AllowedIPs = 10.0.0.1/32, <parents_lan>/24
```

Reset the wg0 interface
```bash
sudo wg-quick down wg0
sudo wg-quick up wg0
```

And `ip route` now shows a valid route to my `parents_lan`

Similarly, the pi at my parents' home has no clue how to route back to my home. I need to add a very similar line to the AllowedIPs.

### Marking
Things seem better but I still can't ping devices on my parents' network directly. I decided to ssh into one device and see if it's seeing the pings with tcpdump and greping on `ICMP`.

The device was able to see the ICMP request but the source address was the address of my computer. This is wrong. It should be the address of the pi on their network.

Looking at the tcpdumps on the pi I see the same issue. I thought wireguard would change the address to 10.0.0.2 and then the masquerading rule would change that to the pi's address.

It seems that what's actually happening is that the wireguard software decrypts the packet and then it's sent off to its destination. Since the source on the packet isn't 10.0.0.2 anymore, it isn't masqueraded.

Let's remove our previous ip table rule:
```bash
sudo iptables -t nat -D POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

Then we need to add two new rules:
```bash
sudo iptables -t mangle -A PREROUTING -i wg0 -j MARK --set-mark 0x1
sudo iptables -t nat -A POSTROUTING -o eth0 -m mark --mark 0x1 -j MASQUERADE
```

The first rule marks all incoming packets from the wg0 interface. The second masquerades all packets that have been previously marked.

Another options would be to masquerade all traffic that goes out through eth0 but this seems cleaner and more correct.

Then we need to save our new rule set:
```bash
sudo sh -c "iptables-save > /etc/iptables/rules.v4"
```

### Future
This blog post is getting long. We still have to figure out how the mobile entries would work. Perhaps they should allow traffic from any ip. But this would conflict with the other rules so maybe not.

Also, I will need to configure the network to also allow devices on my parents' network to reach my network. This means adding masquerading to my pi as well.

Finally, I don't want to add static routing rules to all my devices. I would rather have the routes be discovered automatically. This could involve grabbing a switch and installing some better firmware on it (like pfsense). Or perhaps I could do it via a DNS server on the same pis I use to manage the VPN.

Either way, stay tuned!

## Address Summary For Future SSHing
| IP | Description |
|---|---|
| `10.0.0.1` | Parents' Wireguard Tunnel |
| `10.0.0.2` | Home Wireguard Tunnel |
| `x.x.x.56` | Static LAN IP for Parents' pi |
| `x.x.x.253` | Static LAN IP for Home pi |

