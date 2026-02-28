#!/bin/bash
set -e

# Path to your .env file
ENV_FILE=".env"

# Generate a random 16-byte (32-char hex) password
NEW_PASSWORD=$(openssl rand -hex 16)

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found! Please create it first."
    exit 1
fi

# Function to update or add a variable to the .env file
update_or_add_var() {
    local var_name=$1
    local new_value=$2
    # Check if the variable exists
    if grep -q "^${var_name}=" "$ENV_FILE"; then
        # Variable exists, update it
        sed -i "s|^${var_name}=.*|${var_name}=${new_value}|" "$ENV_FILE"
    else
        # Variable does not exist, add it
        echo "${var_name}=${new_value}" >> "$ENV_FILE"
    fi
}

# Update TURN_USERNAME and TURN_PASSWORD
update_or_add_var "TURN_USERNAME" "turnuser"
update_or_add_var "TURN_PASSWORD" "${NEW_PASSWORD}"

echo "New TURN password generated and updated in .env file."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null
then
    echo "docker-compose could not be found. Please restart services manually."
    exit 1
fi

echo "Restarting coturn and backend services to apply the new password..."
docker-compose restart coturn backend
