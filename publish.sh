#!/bin/bash
hugo
gsutil rsync -r public gs://blog.dumbrava.ca
