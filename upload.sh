#!/bin/bash
gsutil rm -r gs://blog.dumbrava.ca/**
gsutil rsync -r google_bucket gs://blog.dumbrava.ca
