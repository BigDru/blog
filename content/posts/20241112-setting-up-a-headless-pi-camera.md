---
title: "Setting Up a Headless Pi Camera"
date: 2024-11-12
---

## Problem
I have a pi camera already setup. It watches my 3D printer and I can check its webpage from anywhere to see if the print is done. The problem is that I had recently bought a Pi Zero 2 W with the idea that I would make it a "pireguard" device. This device would act as the vpn endpoint between my house and my parent's house. However, after buying it, I thought that I would like the pireguard device to be plugged into the network via ethernet. The Zero 2 doesn't have ethernet. So I would like to switch the pi that's watching my 3D printer (Pi 3 B v1.2) with the Zero. I can't just swap the SD cards because each device has a different device tree on it to ensure all peripherals work. So I need a fresh install of raspbian on the Zero and then port over the configurations files that allow for the webpage to show the USB camera.

## Solution
I used to download the setup image and dd it onto the SD card directly. However, I don't have a micro-HDMI adapter at this time. So I have no way of installing the operating system or setting up SSH. It seems that the raspberry company has since created a Pi Imager that allows you to fully configure the operating system and setup SSH without needing a monitor before even plugging it in the SBC. So this setup will be completely headless.

First, download/install the [imager](https://www.raspberrypi.com/software/).

I'm on arch so `yay -S rpi-imager`

And run it `rpi-imager`.
Note: Do not run it as sudo!

Select the device (Pi Zero 2 W), the OS (64-bit debian bookworm), and the storage (a 64GB A1 microSD card from SanDisk (yes it's overkill I know)). Be careful when selecting the storage. Double check with commands like `sudo dmesg -t`, `lsblk`, or `fdisk -l`. Unfortunately, the list doesn't show the device name as you see in those tools, but we can double check this a bit later.

Click next then Edit Settings for OS customisation settings.

I changed the hostname to `3dcamera`, setup a username and password, and configured wireless LAN (which was automatically filled out using my computer's settings). Then I clicked on the services tab and checked Enable SSH. I left the option for password authentication as I don't need this camera to be super secure. It's also behind my network firewall so it should be safe anyways.

I clicked Yes to apply OS customisation settings. And then Yes again when warned about overwriting existing data. I then got a authentication popup asking to open /dev/sdf1. This is how I knew I selected the wrong device for storage. I want to write directly to /dev/sdf not to the partition that's already there. I clicked cancel and went back to the list and selected the other storage device just below it. Then repeated the process and provided my sudo password.

Writing took about 4 minutes.

Then I plugged the SD card into the Zero and powered it on. I navigated to the address for my gateway and waited for the new `3dcamera` device to show up in the list of devices. This took about 4 minutes. After that, I could `ping 3dcamera` and `ssh dru@3dcamera`.

Next, the usual maintenance `sudo apt update` & `sudo apt upgrade`.

I did the same for the old 3B pi.

On the Zero I installed tmux
```bash
sudo apt install tmux
```

To run tmux off a kitty terminal you must run the following first:
```bash
TERM=xterm-256color
```

There are 3 files at the home directory on the old pi.

gstream.sh:
```bash
#!/bin/bash
sudo -u www-data gst-launch-1.0 v4l2src ! jpegdec ! videoscale ! 'video/x-raw,width=640,height=480' ! videorate ! 'video/x-raw,framerate=5/1' ! jpegenc ! multifilesink location=/var/www/html/webcam.jpg

exit
#sudo -u www-data gst-launch-1.0 v4l2src ! jpegdec ! jpegenc ! multifilesink location=/var/www/html/webcam.jpg

#sudo -u www-data gst-launch-1.0 v4l2src ! video/xraw,format=YUY2,width=640,height=480,framerate=5 ! videoconvert ! jpegenc ! filesink location=/var/www/html/webcam.jpg
#sudo -u www-data gst-launch-1.0 v4l2src ! "image/jpeg,width=640,height=480,framerate=5" ! jpegparse ! jpegdec ! videoconvert ! jpegenc ! filesink location=/var/www/html/webcam.jpg
```

stream.sh:
```bash
#!/bin/bash
while true; do
    sudo -u www-data ffmpeg -y -f video4linux2 -i /dev/video0 -vframes 1 -c:v mjpeg -q:v 2 /var/www/html/webcam.mjpeg
    sleep 5 # Sleep for a second before capturing the next frame
done
```

update.sh:
```bash
#!/bin/bash
sudo -u www-data ffmpeg -y -f video4linux2 -i /dev/video0 -c:v mjpeg -q:v 2 -vf fps=30 /var/www/html/webcam.mjpeg
exit

#sudo -u www-data ffmpeg -y -f video4linux2 -i /dev/video0 -vframes 1 -c:v mjpeg -q:v 2 /var/www/html/webcam.mjpeg
```

All three files seem to do the same thing. They use gstreamer to capture an image from the camera at `/dev/video0` and store it as an image at `/var/www/html/webcam.mjpeg` or `/var/www/html/webcom.jpg`.


Doing an `ls -al` at `/var/www/html/` I see a webcam.jpg and an index.html.

For completeness, here's the html file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Webcam Stream</title>
</head>
<body>
    <img id="webcam" src="/webcam.jpg" alt="Webcam Stream">
    <script>
        var img = document.getElementById('webcam');
        setInterval(function() {
            img.src = '/webcam.jpg?' + new Date().getTime();
        }, 500); // Refresh every x milliseconds
    </script>
</body>
</html>
```

It seems that the script that is being called (from somewhere) is gstreamer.sh.

I did `crontab -l` to see if there were any cronjobs but it came up empty for user dru. Doing `sudo crontab -l` came up empty for root.

Okay, if it's not a cronjob, perhaps its a service. `sudo systemctl list-units` produced a long list in which there was a stream.service entry. Looking at `/etc/systemd/system/`, there is a stream.service file present.

stream.service
```service
[Unit]
Description=Gstreamer streaming service

[Service]
ExecStart=/home/dru/gstream.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Interestingly, the service is in a failed state and isn't recovering. I'll take this opportunity to update the service so it's more robust.

After some research I've learned that systemd stops trying to restart the service if it fails too many times in a row. This is the updated service:

stream.service
```service
[Unit]
Description=Gstreamer streaming service

[Service]
ExecStart=/home/dru/gstream.sh
Restart=always
RestartSec=0.5
StartLimitIntervalSec=0 #disables rate limit

[Install]
WantedBy=multi-user.target
```

The final piece is the webserver. Looking at htop I see some nginx processes running. The config is at `/etc/nginx/sites-available/webcam.conf`

webcam.conf
```nginx
# /etc/nginx/sites-available/webcam.conf
server {
    listen 80;
    server_name _;

    # MIME types for HLS streaming
    # These types should be included in the http block of your nginx.conf
    # This is just a reference as it might be already included in /etc/nginx/mime.types
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }

    location / {
        root /var/www/html;
        index index.html index.htm;

        # CORS headers to allow access from any origin
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    }

    # Location block for serving .mjpeg files
    # The Content-Type for MJPEG is multipart/x-mixed-replace without a boundary parameter
    location ~* \.mjpeg$ {
        add_header 'Cache-Control' 'no-cache';
        add_header 'Content-Type' 'multipart/x-mixed-replace;boundary=myboundary' always;
        root /var/www/html;
    }

    # Location block for serving HLS playlist (m3u8) and segment (ts) files
    location ~ \.(m3u8|ts)$ {
        root /var/www/html;
        add_header 'Cache-Control' 'no-cache, no-store, must-revalidate' always;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    }
}
```

Okay! Let's copy everything over to the new pi (Zero):
 - nginx conf
 - stream.service
 - gstream.sh
 - index.html

The general format for file copy is:

```bash
scp gstream.sh dru@3dcamera:/home/dru/
```

I need to install the dependencies on the Zero. I did a `history | grep install` to see what other packages were installed on the old pi and added them to the list.

```bash
sudo apt install nginx gstreamer1.0-tools gstreamer1.0-plugins-good gstreamer1.0-plugins-bad btop vim tldr
```

Let's copy the files to their appropriate locations:

```bash
sudo cp index.html /var/www/html/;
sudo chown www-data:www-data /var/www/html/index.html;
sudo cp webcam.conf /etc/nginx/sites-available/;
sudo ln -s /etc/nginx/sites-available/webcam.conf /etc/nginx/sites-enabled/webcam;
sudo rm /etc/nginx/sites-enabled/default;
sudo rm /var/www/html/index.nginx-debian.html;
sudo cp stream.service /etc/systemd/system/;
sudo systemctl enable stream.service;
sudo systemctl start stream.service
```

I plugged in the camera and...... it didn't work.

dmesg shows that the device is recognized. Running the gstreamer.sh script directly gives an error saying that the device /dev/video0 could not be opened for reading. It seems that www-data needs to be part of the video group:

```bash
sudo usermod -aG video www-data
```

Still doesn't work but now we get a different error. Now there's an error writing the file. I forgot to make www-data the owner of the `/var/www/html//` directory. Btw, the www-data user is the user nginx uses for normal operations.

And then..... it worked!!

{{<carousel
    max_image_height="500px"
    images="/images/20241112-setting-up-a-headless-pi-camera/setting-up-a-headless-pi-camera-1-1.png">}}

I rebooted to make sure the config survived reboots and it kept working. The last part is to give the Zero a static ip address in my home's router so that the website is always live at the same ip address.
