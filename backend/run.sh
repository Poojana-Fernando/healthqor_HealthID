#!/bin/bash
# Load environment variables from ../.env
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Ignore comments and empty lines
        if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ ! "$line" =~ ^[[:space:]]*$ ]]; then
            # Export variable, handle lines with '='
            if [[ "$line" == *"="* ]]; then
                export "$line"
            fi
        fi
    done < "$ENV_FILE"
    echo "Loaded environment from $ENV_FILE"
else
    echo "Warning: .env not found at $ENV_FILE"
fi

# Ensure required env vars are set
required=("DB_USER" "DB_PASSWORD" "HEALTHID_ENCRYPTION_KEY" "JWT_SECRET")
for var in "${required[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Missing required env var: $var"
        exit 1
    fi
done

# Run maven
mvn spring-boot:run
