# Multi-Tenant Database Architecture

## Overview
This system implements proper database-level isolation for multi-tenancy using:
- **Landlord Database**: Stores tenant information and authentication data
- **Tenant Schemas**: Each tenant has a separate PostgreSQL schema for data isolation

## Architecture Components

### 1. Landlord Database (`erp_landlord`)
Contains:
- `tenants` table: Tenant information (id, name, slug, schemaName, etc.)
- `landlord_users` table: User authentication (email, password, tenantId)

### 2. Tenant Database (`erp_db`)
Contains multiple schemas (one per tenant):
- `tenant_<slug>`: Each tenant's isolated data
- All application tables exist within each tenant schema

## Implementation Files Created

### Core Files
1. **Landlord Entities**
   - `src/common/landlord/entities/tenant.entity.ts` - Tenant information
   - `src/common/landlord/entities/landlord-user.entity.ts` - Authentication users

2. **Landlord Services**
   - `src/common/landlord/services/landlord.service.ts` - Tenant management and auth

3. **Tenant Management**
   - `src/common/tenant/tenant-connection.service.ts` - Schema switching service
   - `src/common/tenant/tenant.guard.ts` - Guard to switch schemas based on JWT
   - `src/common/tenant/tenant.module.ts` - Tenant module

4. **Database Configs**
   - `src/config/landlord-database.config.ts` - Landlord DB config
   - `src/config/tenant-database.config.ts` - Tenant DB config (dynamic)

## Next Steps to Complete Implementation

### 1. Update App Module
Add landlord and tenant modules to `app.module.ts`:
```typescript
imports: [
  // ... existing imports
  LandlordModule,
  TenantModule,
]
```

### 2. Update Auth Service
- Change authentication to use `LandlordUser` from landlord database
- After successful auth, load user from tenant database using tenantId
- Include `tenantId` in JWT token

### 3. Update JWT Strategy
- Include `tenantId` in JWT payload
- Use landlord database for initial user lookup

### 4. Update Registration
- Create tenant in landlord database
- Create tenant schema in tenant database
- Create landlord user
- Create user in tenant database
- Run migrations for tenant schema

### 5. Apply Tenant Guard Globally
Add `TenantGuard` as a global guard or use interceptor to switch schemas per request

### 6. Remove businessId Filtering
- Remove `businessId` from all entity queries (data is isolated at schema level)
- Remove `TenantEntity.businessId` column
- Update all services to not filter by businessId

### 7. Update Middleware/Interceptor
Create an interceptor that runs after JWT auth to:
1. Extract tenantId from JWT
2. Load tenant from landlord DB
3. Switch connection to tenant schema using `TenantConnectionService`
4. Reset schema after request completes

## Database Schema Creation
When registering a new tenant:
1. Create tenant record in landlord DB
2. Create PostgreSQL schema: `CREATE SCHEMA IF NOT EXISTS "tenant_<slug>"`
3. Run migrations for tenant schema
4. Create initial user in tenant database

## Request Flow
1. User logs in → Auth uses landlord DB
2. JWT issued with `tenantId`
3. Request with JWT → Guard/Interceptor extracts `tenantId`
4. Load tenant from landlord DB
5. Switch connection to tenant schema
6. All subsequent queries use tenant schema
7. Schema reset after request

## Benefits
- **True Data Isolation**: Data physically separated in different schemas
- **Security**: No risk of cross-tenant data leakage
- **Scalability**: Easy to move schemas to different databases later
- **Compliance**: Better for data residency requirements
