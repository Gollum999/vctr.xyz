#!/bin/bash

# read -s -p"Enter passphrase for key '/home/tim/.ssh/id_rsa': " pw
if ! ssh-add -l | grep -q SHA256:LGcq6VKRiXu7C88nIQxDd/DO7TQ0D4wwqAozK+IIkME; then
    echo "Could not find ssh key, adding"
    eval `ssh-agent -s`
    ssh-add ~/.ssh/id_rsa
fi
pushd $(dirname "$0")/.. &&
npm run build &&
pushd ./dist &&
git init &&
git remote add origin "git@bitbucket.org:Gollum999/gollum999.bitbucket.io.git" &&
git fetch origin &&
git add --all &&
git commit -m "Initial commit" &&
# export GIT_ASKPASS="echo $pw"
git push --force --set-upstream origin master &&
popd &&
popd
