#!/bin/sh
# This will push the subtree to the gh-pages branch.
# Effectively publishing the page as it is in the /public folder.
# to force it in case of error, this can be used:
# git push origin `git subtree split --prefix public master`:gh-pages --force
git subtree push --prefix public origin gh-pages
