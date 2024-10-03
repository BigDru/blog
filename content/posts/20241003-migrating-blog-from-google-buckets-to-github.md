---
title: "Migrating Blog From Google Buckets to Github"
date: 2024-10-03
---

## Problem
I'm a big fan of google buckets. You drop your hugo public folder in a bucket, point the DNS servers to that bucket and your done. Static website is live!

However, this only works for non secure HTTP. If I want HTTPS I need to pay google monthly for certificate signing and redirecting. I don't want to pay for a static website. If I'm paying for webhosting I'll just run my own droplet with full control over everything on Digital Ocean.

This blog is 100% static. I don't need any dynamic content served at the moment (that may change in the future). But, I don't like not having HTTPS.

## Solution
Github pages offers free certificate singing and custom domain name hosting. So I think it's time to migrate my site to github!

Before we start, let me cover the current configuration. I have a separate project on my google console for my blog. It has a id associated with it.

### Google Cloud
This project has a bucket ('/' > buckets > Buckets (Cloud Storage)). This bucket is called blog.dumbrava.ca and has public access to internet enabled. It's region is northamerica-northeast2 and its default storage class is Standard (make sure this isn't Autoclass). Additionally the encryption type is Google-managed and there is an allUsers principle that has the role Storage Object Viewer assigned as a permission.

The gsutil uri is gs://blog.dumbrava.ca. This is used by my update.sh script to upload to the bucket whenever I want to push updates.

The upload.sh script is quite simple:

```bash
#!/bin/bash
rm -rf ./public/*
hugo
gsutil rm -r gs://blog.dumbrava.ca/**
gsutil rsync -r public gs://blog.dumbrava.ca
```

A note: if configuring your own google bucket, there was some tricky business with making sure the HTTPS handling is disabled. Having it enabled (which is a default) results in service charges so be careful! Unfortunately, I do not remember exactly what this setting was and how to fix it, but I ended up paying something close to $30 a month for 4 months until I realized this was happening.

### Github
I already have my raw hugo repo on github so all I should need to do is setup some github actions to build on commit and update the site. The public folder created by hugo on build is part of the .gitignore (as it should be) so github actions is perfect for this. I'll start by having a github.io domain name for testing purposes and then at the end of the article I will switch where the DNS servers point.

You can see below the steps I took to setup a Hugo build github action. Summary is Settings > Pages > Build Source -> Github Actions > browse all workflows > Pages > View all > Hugo > configure. The last image below shows the config `hugo.yml` file that is added to .github/workflows/

{{<carousel
    max_image_height="500px"
    images="/images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-1.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-2.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-3.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-4.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-5.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-6.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-1-7.png">}}

One benefit of doing it this way is that it recognizes my branches correctly. I saved the commit and in theory, that I would need to do to make it work.

Click on Actions for the repo and you will see the build and its status. This is what it looked like for me:

{{<carousel
    max_image_height="500px"
    images="/images/20241003-migrating-blog-from-google-bucket-to-github/20241003-2-1.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-2-2.png, /images/20241003-migrating-blog-from-google-bucket-to-github/20241003-2-3.png">}}

So my build failed and it seems it's because the submodule's commit doesn't exist. This makes sense as that's a local commit on my computer meant to patch some issues with the poison theme. To get around this I need the fixes to be available on the internet. I would have also come across this issue if I had developed on another computer at any point. So I'm going to fork the poison theme and apply those changes.

First I went to the theme's github page: https://github.com/lukeorth/poison and forked it into my own repository (hugo-theme-poison). I cloned that repository locally and reapplied the changes I had made. I committed to a new branch (dru) and pushed the changes back to github.

To remove the previous submodule I did the following:
 - `git pull`
 - `rm .gitmodules` (This is the only submodule so I deleted the whole file)
 - `git add .`
 - remove relevant section in .git/config
 - `git rm --cahced themes/poison/`
 - `rm -rf .git/modules/*`
 - `rm -rf themes/*`
 - `git commit -m "Chore: removed old poison submodule"`
 - `cd themes`
 - `git submodule add git@github.com:bigdru/hugo-theme-poison`

Finally, the new theme is called hugo-theme-poison (the name of the subfolder in the themes folder). We need to update the theme line in the hugo.toml config to the name of the folder ('hugo-theme-poison'). Then just add, commit, and push to github.

This time when we go back to the blog's Actions page we see a build and deploy that has completed successfully!

{{<carousel
    max_image_height="500px"
    images="/images/20241003-migrating-blog-from-google-bucket-to-github/20241003-3-1.png">}}

Navigating to https://bigdru.github.io/blog/ we can see the blog up and running!

Unfortunately, there are some issues with the subpages in the menu. Clicking portfolio goes to https://bigdru.github.io/portfolio which in turn returns a 404. As there is no portfolio repository with pages enabled this makes sense. Thankfully, this should be fixed automatically when we use the custom domain name so I won't play around with the hugo.toml file right now.

To change the DNS I added a couple A and AAAA records to my domain manager. I made them point to Github's servers. Then I went to the repo's settings and added my domain (dumbrava.ca) to the custom domain field. I also created a CNAME for blog.dumbrava.ca to the apex domain as I don't have anything else under this domain at the moment.
One issue I ran across while testing this is getting my css and js to load properly. For some reason the github actions yaml script would overwrite my baseURL setup in my `hugo.toml`. So if you are doing the same find the run portion of the script and remove the `--baseURL` override.
