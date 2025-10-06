#!/bin/bash

# Go into rewind-ui, run lint, then return
cd rewind-ui || exit 1
yarn lint --fix