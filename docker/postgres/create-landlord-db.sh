#!/bin/bash
# Script to create the erp_landlord database manually
# Usage: ./docker/postgres/create-landlord-db.sh [container_name] [db_user]
# Or: docker exec -i erp_postgres psql -U postgres -c "CREATE DATABASE erp_landlord;"

# Try to find the postgres container automatically if not provided
if [ -z "$1" ]; then
    CONTAINER_NAME=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)
else
    CONTAINER_NAME=$1
fi

DB_USER=${2:-postgres}
DB_NAME="erp_landlord"

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ PostgreSQL container not found. Please specify container name as first argument."
    echo "Usage: $0 [container_name] [db_user]"
    echo "Example: $0 erp_postgres postgres"
    exit 1
fi

echo "Checking if database $DB_NAME exists in container $CONTAINER_NAME..."

# Check if database exists
EXISTS=$(docker exec -i $CONTAINER_NAME psql -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$EXISTS" = "1" ]; then
    echo "✅ Database $DB_NAME already exists"
    exit 0
fi

echo "Creating database $DB_NAME..."
OUTPUT=$(docker exec -i $CONTAINER_NAME psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>&1)

# Check if creation was successful or if database already exists
if echo "$OUTPUT" | grep -q "already exists"; then
    echo "✅ Database $DB_NAME already exists"
elif echo "$OUTPUT" | grep -q "CREATE DATABASE"; then
    echo "✅ Database $DB_NAME created successfully"
else
    # Double-check if it exists now
    EXISTS_AFTER=$(docker exec -i $CONTAINER_NAME psql -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
    if [ "$EXISTS_AFTER" = "1" ]; then
        echo "✅ Database $DB_NAME exists"
    else
        echo "❌ Failed to create database $DB_NAME"
        echo "Error output: $OUTPUT"
        exit 1
    fi
fi
