#!/bin/bash
# Load environment variables from ../.env
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ ! "$line" =~ ^[[:space:]]*$ ]]; then
            if [[ "$line" == VITE_* ]]; then
                continue
            fi
            if [[ "$line" == *"="* ]]; then
                export "$line"
            fi
        fi
    done < "$ENV_FILE"
    echo "Loaded environment from $ENV_FILE"
else
    echo "Warning: .env not found at $ENV_FILE"
fi

required=("MONGODB_URI" "HEALTHID_ENCRYPTION_KEY" "JWT_SECRET")
for var in "${required[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Missing required env var: $var"
        exit 1
    fi
done

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
export CACHE_TYPE="${CACHE_TYPE:-simple}"

mvn spring-boot:run
