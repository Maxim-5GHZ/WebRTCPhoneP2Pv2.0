#!/bin/bash
set -e

# Generate a random 32-character password
NEW_PASSWORD=$(openssl rand -base64 24)

# Create or overwrite the .env file
echo "TURN_USERNAME=turnuser" > .env
echo "TURN_PASSWORD=${NEW_PASSWORD}" >> .env

echo "New TURN password generated and saved to .env file."

echo "Restarting coturn and backend services to apply the new password..."
docker-compose restart coturn backend
