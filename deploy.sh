#!/bin/bash
# Deploy movie-guessing-game to S3 + CloudFront
# Usage: ./deploy.sh
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure)
#   - S3 bucket created with a CloudFront distribution pointing to it (OAC)
#
# Fill in your values below:
BUCKET_NAME="movie-guessing-game-ui"
DISTRIBUTION_ID="E2IP2LBDGIWQDK"

set -e

echo "Syncing dist/ to s3://$BUCKET_NAME ..."
aws s3 sync ./dist s3://$BUCKET_NAME --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Done. Your site is live."
