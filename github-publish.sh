#!/bin/sh
# This will push the subtree to the gh-pages branch.
# Effectively publishing the page as it is in the /public folder.
git subtree push --prefix public origin gh-pages
