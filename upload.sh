#!/bin/bash
hugo
gsutil rm -r gs://blog.dumbrava.ca/**
gsutil rsync -r public gs://blog.dumbrava.ca
