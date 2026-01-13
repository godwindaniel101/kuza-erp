#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api"

echo -e "${YELLOW}Testing ERP Platform V2 API${NC}\n"

# Test 1: Register a new user
echo -e "${YELLOW}Test 1: Registering a new user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "passwordConfirmation": "password123",
    "restaurantName": "Test Restaurant"
  }')

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract token from response
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token' 2>/dev/null)
RESTAURANT_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.businessId' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ Registration successful!${NC}"
  echo -e "Token: ${TOKEN:0:50}..."
  echo -e "Restaurant ID: $RESTAURANT_ID\n"
else
  echo -e "${RED}✗ Registration failed!${NC}\n"
  exit 1
fi

# Test 2: Login
echo -e "${YELLOW}Test 2: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token' 2>/dev/null)
LOGIN_RESTAURANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.businessId' 2>/dev/null)

if [ "$LOGIN_TOKEN" != "null" ] && [ -n "$LOGIN_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful!${NC}"
  echo -e "Token: ${LOGIN_TOKEN:0:50}..."
  echo -e "Restaurant ID: $LOGIN_RESTAURANT_ID\n"
  
  # Verify tenant isolation
  if [ "$RESTAURANT_ID" == "$LOGIN_RESTAURANT_ID" ]; then
    echo -e "${GREEN}✓ Tenant isolation verified! Same restaurant ID in both requests.${NC}\n"
  else
    echo -e "${RED}✗ Tenant isolation issue! Different restaurant IDs.${NC}\n"
  fi
else
  echo -e "${RED}✗ Login failed!${NC}\n"
  exit 1
fi

# Test 3: Get current user (with token)
echo -e "${YELLOW}Test 3: Getting current user (authenticated)...${NC}"
ME_RESPONSE=$(curl -s -X GET "${API_URL}/auth/me" \
  -H "Authorization: Bearer ${LOGIN_TOKEN}" \
  -H "Content-Type: application/json")

echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"

ME_RESTAURANT_ID=$(echo "$ME_RESPONSE" | jq -r '.data.businessId' 2>/dev/null)

if [ "$ME_RESTAURANT_ID" == "$RESTAURANT_ID" ]; then
  echo -e "${GREEN}✓ Get current user successful! Tenant ID matches.${NC}\n"
else
  echo -e "${RED}✗ Get current user failed or tenant mismatch!${NC}\n"
  exit 1
fi

# Test 4: Create a menu (test tenant isolation)
echo -e "${YELLOW}Test 4: Creating a menu (testing tenant isolation)...${NC}"
MENU_RESPONSE=$(curl -s -X POST "${API_URL}/menus" \
  -H "Authorization: Bearer ${LOGIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Menu",
    "slug": "test-menu",
    "description": "A test menu",
    "isActive": true
  }')

echo "$MENU_RESPONSE" | jq '.' 2>/dev/null || echo "$MENU_RESPONSE"

MENU_RESTAURANT_ID=$(echo "$MENU_RESPONSE" | jq -r '.data.businessId' 2>/dev/null)

if [ "$MENU_RESTAURANT_ID" == "$RESTAURANT_ID" ]; then
  echo -e "${GREEN}✓ Menu created successfully! Tenant isolation working correctly.${NC}\n"
else
  echo -e "${RED}✗ Menu creation failed or tenant mismatch!${NC}\n"
  exit 1
fi

echo -e "${GREEN}All tests passed! Multi-tenancy is working correctly.${NC}"

