# Quick Start Guide - V2 ERP Platform

## Prerequisites
- Docker Desktop installed and running
- Ports 3000 and 5433 available

## Start the Application

```bash
cd v2
docker-compose -f docker-compose.dev.yml up -d
```

Wait 15-20 seconds for services to start.

## Test Registration & Login

### Option 1: Use the test script
```bash
cd backend
./test-api.sh
```

### Option 2: Manual testing

#### 1. Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "passwordConfirmation": "password123",
    "restaurantName": "Test Restaurant"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "businessId": "...",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

#### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 3. Get current user (verify tenant)
```bash
# Replace YOUR_TOKEN with the token from login response
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Verify Multi-Tenancy

1. Register two users with different restaurant names
2. Note their `businessId` values
3. Create resources (menus, employees, etc.) with each user's token
4. Verify that each user only sees their own restaurant's data

## Access Services

- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **PostgreSQL**: localhost:5433

## Stop Services

```bash
docker-compose -f docker-compose.dev.yml down
```

## Clean Up (Remove All Data)

```bash
docker-compose -f docker-compose.dev.yml down -v
```

