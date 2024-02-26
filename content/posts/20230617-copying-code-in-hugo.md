---
title: "Copying Code in Hugo"
date: 2023-06-17T15:45:41-04:00
draft: true
---

## Problem
While transfering my first blog post [Powering on Monitors with ddcutil](/content/posts/powering-on-monitors-with-ddcutil.md) from Blogger to Hugo I decided that I wanted to have a nice copy widget that allows myself or other readers to copy any code I write. While doing that I decided I might as well write about this as well.

## Starting solution
I knew I could tell hugo that specific lines of code are code by using what is called a "code fence". This is a series of back ticks followed by a language.

````markdown
```bash
sudo pacman -S ddcutil
```
````

I had two problems, the output wasn't formatted nicely and there was no nice way of copying the code.

I found a [blog post](https://aaronluna.dev/blog/add-copy-button-to-code-blocks-hugo-chroma/) by one Aaron Luna. It served as a very nice starting point. After reading his code and throwing in a bunch of `console.log()`s I figured out what was going on.

One gotcha I encountered had to do with the hugo.toml settings for syntax highlighting. The [offical website](https://gohugo.io/getting-started/configuration-markup/#highlight) shows the default markup.highlight options:

```toml
[markup]
  [markup.highlight]
    anchorLineNos = false
    codeFences = true
    guessSyntax = false
    hl_Lines = ''
    hl_inline = false
    lineAnchors = ''
    lineNoStart = 1
    lineNos = false
    lineNumbersInTable = true
    noClasses = true
    noHl = false
    style = 'monokai'
    tabWidth = 4
```

I quickly replaced the style with Nord (which is natively available) as that's what I use for my console and it felt homier. This helped fix the majority of the styling issues. I also played around with some color values in Aaron's css code and added 1em to the bottom margin of the highlight class. Aaron's css also had some overwriting definitions for the highlight element. I preemptively removed these.

The gotcha occured because, a lot of Aaron's code depended on a "chroma" class. However, when I was inspecting my resulting website, I had no "chroma" class. I eventually decided to change the `noClasses` to `false` and the chroma class magically appeared.

To make the new setting behave properly I needed to create a `syntax.css` file:

```bash
hugo gen chromastyles --style=nord > static/css/nord.css
```

I then copied the `stylesheet.html` from my theme to `layouts/partials/head/stylesheet.html` and added some lines. The full file looks like this:

```html
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/poole.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/syntax.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/hyde.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/poison.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/fonts.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/katex.min.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/tabs.css">

<!-- Custom CSS -->
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/code_copy.css">
<link type="text/css" rel="stylesheet" href="{{ .Site.BaseURL }}css/nord.css">
```

The poison theme initially included the option to overwrite a `custom.css` file to further customize the theme, but that felt too limiting so I decided to overwrite the whote `stylesheet.html` instead.

## Fine tuning the CSS
At this point the only thing that needed fixing was the code snippets with numbers. These are specified by adding `{linenos=table}` after the language specifier in the code fence definition. We need the line numbers style to be set to table so that the numbers show up in a different column. This ensures that the Javascript copy function doesn't copy the numbers with the code when the "Copy" button is pressed.

After some investigation I found that Aaron's CSS also modifies the look of the number columns. Specifically the following code specifies the style for the first column:

```css
.chroma .lntd:first-child {
  padding: 7px 7px 7px 10px;
  margin: 0;
}
```

The nord theme specifies that `lntd` is the class for is LineTableTD.

## Adding language tab

Aaron left a comment on his blog post explaining how he added the language tab above his code snippets. His code looks like this:

```css
.chroma [data-lang]:before {
    position: absolute;
    z-index: 0;
    top: -22px;
    left: 0px;
    content: attr(data-lang);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    padding: 5px 10px 7px;
}
```

This code takes the data-lang attribute and puts it before the .chroma class. To make this look nicely I added 2em top padding to the highlight class and changed the background color to match my nord theme.

## Custom text for the language tab

Next I would like to overwrite the text inserted into the code snippet. Unfortunately, hugo doesn't seem to support passing custom variables into the code fence so I decided to use a workaround for what I wanted to do.

First, I need to include raw HTML in my hugo output. This is disabled by default for security reasons. If you don't know what you're including it could potentially be dangerous.

My site is completely static and the output files are directly copied into a special Google bucket for the purposes of distribution. Additionally my website is versioned with git, so even if some malicious code gets in somehow, I'm quite safe.

To allow unsafe code in the Goldmark renderer I updated my hugo.toml to include:

<!-- test -->
```toml
[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true
```

Now that we have custom HTML showing up we can store our custom text in HTML and then use Javascript to swap it in after the page is finished loading. We have several options here.. comments, custom element with specific class specifier

## Todo
 - It would be nice to have the option to disable the copy button if I so desire
 - Aaron's blog also has a language tab above the code snippet that allows him to show the language. He makes a comment on how to do that in the post
 - If I put in a non-standard type such as "output", the formatting fully breaks. I believe it's because the Chroma parser doesn't support all types.
    - A solution to this would be to somehow pass in a second parameter that I can then use to render any text I want as part of the code fence. So if I write something like:

      ````markdown
      ```text Output
      <output here>
      ```
      ````
      The tab at the top would say "Output"
 - Finally, the number formatting looks bad. The table linenos value is required as I don't want to copy the numbers but the formatting needs to be improved

## end
