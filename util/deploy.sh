#!/bin/bash

# read -s -p"Enter passphrase for key '/home/tim/.ssh/id_rsa': " pw
pushd $(dirname "$0")/..
npm run build
pushd ./dist
git add --all
git commit --amend -m "Initial commit"
# export GIT_ASKPASS="echo $pw"
git push --force
popd
popd
