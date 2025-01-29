---
title: "Running Docker Based Jupyter Notebooks with Tensorflow"
date: 2025-01-29
---

## Problem
For my UoT Continuing Education program we regularly do things in jupyter notebooks. I made a script to launch these notebooks in a local docker container.

## Solution

Full Command:
```bash
docker run -it --rm --gpus all -v "${PWD}:/tf/notebooks" --user root -e CHOWN_HOME=yes --name tensorflow -p 8888:8888 tensorflow/tensorflow:latest-gpu-jupyter /bin/bash -c "source /etc/bash.bashrc && cd /tf && pip install jupyterlab-vim && find /tf/notebooks -type f -name '*.ipynb' -exec jupyter trust {} + && jupyter lab --notebook-dir=/tf --ip 0.0.0.0 --no-browser --allow-root --NotebookApp.rate_limit_window=30.0"
```

Let's break this down.

Everything is run in the docker command. We say we want to run a temporary (`--rm`) docker container as interactive (`-it`). We want it to be interactive so that we can easily run some additonal setup directly to the official image without creating our own instance of the image. It also let's us attach our tty to it if we need to debug things. Note that these are actually two flags together (`-i` and `-t`).

We also want access to give docker access to all the GPUs on the system (`--gpus all`). This is expecially important for the gpu based jupyter notebook.

`-v "${PWD}:/tf/notebooks`\
This flag tells docker to mount our current directory (the result of the print working directory command) as a volume in the container's /tf/notebooks folder.

`--user root -e CHOWN_HOME=yes`\
Here we say that we want the user that's logged in to be root. In order for this to work properly we need to chown the home directory. The CHOWN_HOME environmental variable tells the jupyter docker image to do that. [See docs.](https://jupyter-docker-stacks.readthedocs.io/en/latest/using/common.html#docker-options)

Next we give it a name (`--name`) of tensorflow and let it listen to port 8888 (`-p 8888:8888`). We also talk to it on port 8888. This is why it's written twice. One is external to the container, the other is internal.

`tensorflow/tensorflow:latest-gpu-jupyter /bin/bash`\
Then we specify the image and the command to run. There are other images available. [Jupyter Repos](https://hub.docker.com/u/jupyter) but for heavy ML work I use the [official tensorflow image](https://hub.docker.com/r/tensorflow/tensorflow). `latest-gpu-jupyter` is the tag. Here I use the latest stable gpu pased juypter notebook. You can also take out the gpu (`latest-jupyter`) if you want to run on everything CPU only. At that point you may as well take out the `--gpu all` as well.

```bash
/bin/bash -c "source /etc/bash.bashrc && cd /tf && pip install jupyterlab-vim && find /tf/notebooks -type f -name '*.ipynb' -exec jupyter trust {} + && jupyter lab --notebook-dir=/tf --ip 0.0.0.0 --no-browser --allow-root --NotebookApp.rate_limit_window=30.0"
```
Finally we have the bash command. The `-c` tells bash to execute the string following. We `source` the bashrc (which might honestly be redundant), `cd` to the parent folder of our mounted volume and use `pip` to install jupyterlab-vim. Why? Because I'm a vim user. Also I like jupyterlab more than the base jupyter notebooks.

Then there's a `find` command. This will look into our mounted volume for any file \
(`-type f`) that ends in *.ipynb (any notebook). When it finds that file it will execute the following: `jupyter trust {} +`. An alternative is `jupyter trust {} \`. The difference is what happens when it finds multiple files. The first one concatenates each file to one command:\
`jupyter trust 1.ipynb 2.ipynb`\
The second one creates new commands for each:\
`jupyter trust 1.ipynb`\
`jupyter trust 2.ipynb`

We need this command as jupyter throws a lot of errors if you open an unsigned/untrusted notebook. You can always trust the notebook manually from the menu but I added this so I don't need to do it every time.

The final command is to launch jupyter lab using the /tf directory. If there are any options you want to add to jupyter this would be where you would do it. You can also launch non-lab mode if you do `jupyter notebook` here instead.
