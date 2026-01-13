# Backend Documentation - ERP System v2

## Overview
The backend is built with **NestJS**, **TypeScript**, **PostgreSQL**, and follows a modular architecture with multi-tenant support. It provides RESTful APIs for all system functionality.

## Architecture

### Core Framework
- **NestJS** - Node.js framework with TypeScript
- **TypeORM** - Database ORM with entity relationships
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure token-based auth
- **Docker** - Containerized deployment

### Module Structure
```
src/modules/
├── auth/           # Authentication & authorization
├── dashboard/      # Dashboard statistics & analytics
├── hrms/          # Human Resource Management
├── ims/           # Inventory Management System
├── notifications/ # Real-time notifications
├── profile/       # User profile management
├── rms/          # Restaurant Management System
├── settings/     # System configuration
└── users/        # User management
```

## Authentication & Authorization

### JWT Authentication
```typescript
// Location: src/modules/auth/
- JwtAuthGuard: Validates JWT tokens
- JwtStrategy: Token extraction and validation
- LoginDto: Authentication payload validation
```

### Permission System
```typescript
// Location: src/common/guards/permissions.guard.ts
@RequirePermissions("resource.action")
// Example: @RequirePermissions("inflows.create")
```

### Multi-Tenant Architecture
- **Tenant Isolation**: Each business has isolated data
- **TenantEntity**: Base entity with businessId field
- **Automatic Filtering**: All queries filtered by tenant

## Module Details

### 1. Authentication Module (`auth/`)

#### Controllers
- **AuthController**: Login, register, password reset
- **InvitationsController**: User invitations system

#### Services
- **AuthService**: Core authentication logic
- **InvitationsService**: Invitation management

#### Key Features
- JWT token generation and validation
- Role-based access control
- User invitation system
- Password reset functionality

### 2. Inventory Management System (`ims/`)

#### Entities
```typescript
// Core Entities
- InventoryItem: Product master data
- InventoryCategory: Item categorization
- InventoryInflow: Stock incoming transactions
- InventoryInflowItem: Individual inflow line items
- BranchInventoryItem: Branch-specific stock levels
- BulkUploadLog: Bulk upload tracking
```

#### Controllers & Services
- **ItemsController/Service**: Inventory item CRUD
- **CategoriesController/Service**: Category management
- **InflowsController/Service**: Stock inflow operations
- **InventoryController/Service**: Stock level management

#### Key Features
- **Multi-UOM Support**: Unit of measure conversions
- **Branch-Specific Inventory**: Stock per location
- **Bulk CSV Upload**: Mass data import with validation
- **Batch Tracking**: 6-character batch IDs (e.g., A1B2C3)
- **Supplier Auto-Creation**: Automatic supplier creation during imports
- **Failed Upload Tracking**: Branch-specific error logging

#### Bulk Upload Process
```typescript
1. CSV Validation: Header and data format validation
2. Entity Lookup: Branch, item, supplier, UOM validation
3. UOM Conversion: Convert to base units using conversion service
4. Batch Creation: Group by branch, create separate inflows
5. Error Logging: Track failures per branch in BulkUploadLog
6. Invoice Generation: Format XXX-XXXX-XXXX (supplier-date-random)
```

### 3. Restaurant Management System (`rms/`)

#### Entities
```typescript
- Order: Sales transactions
- OrderItem: Individual order line items
- Table: Restaurant table management
- Supplier: Vendor information
- OrderItemInflowItem: Links sales to inventory batches
```

#### Controllers & Services
- **OrdersController/Service**: Sales order management
- **TablesController/Service**: Table management
- **SuppliersController/Service**: Vendor management

#### Key Features
- **FIFO Inventory Allocation**: First-in-first-out stock usage
- **Multi-Branch Sales**: Branch-specific transactions
- **Cost Calculation**: Automatic cost tracking with profit analysis
- **Payment Integration**: Multiple payment methods
- **Batch Traceability**: Track which inventory batch was sold

#### Sales Allocation Logic
```typescript
1. Order Creation: Customer places order
2. Inventory Check: Verify stock availability per branch
3. FIFO Allocation: Allocate oldest stock first
4. Cost Calculation: Calculate using weighted average cost
5. Inventory Update: Reduce stock levels
6. Profit Tracking: Revenue - Cost = Profit
```

### 4. Human Resource Management (`hrms/`)

#### Entities
```typescript
- Employee: Staff information
- Department: Organizational units
- LeaveType: Leave categories
- Leave: Leave applications
- Payroll: Salary processing
```

#### Key Features
- Employee lifecycle management
- Department organization
- Leave management system
- Basic payroll processing

### 5. Settings Module (`settings/`)

#### Entities
```typescript
- Branch: Location/outlet management
- Role: Permission groups
- Restaurant: Main business entity
```

#### Key Features
- Multi-branch configuration
- Role-based permissions
- System-wide settings
- Business profile management

## Database Schema

### Key Relationships
```sql
-- Multi-tenant isolation
Restaurant (1) → (*) Branch
Restaurant (1) → (*) User
Restaurant (1) → (*) InventoryItem

-- Inventory flow
InventoryItem (1) → (*) InventoryInflowItem
Branch (1) → (*) InventoryInflow
Branch (1) → (*) BranchInventoryItem

-- Sales tracking  
Order (1) → (*) OrderItem
OrderItem (1) → (*) OrderItemInflowItem
InventoryInflowItem (1) → (*) OrderItemInflowItem
```

### Indexing Strategy
- Primary keys: UUID with btree index
- Business ID: Composite indexes for tenant filtering
- Foreign keys: Indexed for join performance
- Timestamps: Indexed for date range queries

## API Patterns

### Standard REST Endpoints
```typescript
GET    /api/module/resource     # List all
POST   /api/module/resource     # Create new
GET    /api/module/resource/:id # Get by ID
PATCH  /api/module/resource/:id # Update
DELETE /api/module/resource/:id # Delete
```

### Bulk Operations
```typescript
POST /api/ims/inflows/bulk-upload
POST /api/ims/inventory/bulk-upload
GET  /api/ims/inflows/template
```

### Response Format
```typescript
{
  success: boolean,
  data: any,
  message?: string,
  errors?: string[]
}
```

## Error Handling

### Global Exception Filter
```typescript
// Location: src/common/filters/
- HttpExceptionFilter: Standardized error responses
- ValidationPipe: Request payload validation
- Custom exceptions for business logic errors
```

### Validation Strategy
```typescript
// DTOs with class-validator decorators
@IsNotEmpty()
@IsString()
@IsOptional()
@IsUUID()
```

## Performance Optimizations

### Database
- **Eager/Lazy Loading**: Strategic relation loading
- **Query Optimization**: Selective field loading
- **Connection Pooling**: Efficient DB connections
- **Indexing**: Critical paths indexed

### Caching Strategy
- **In-Memory Caching**: Frequently accessed data
- **Query Result Caching**: Complex aggregations
- **Session Storage**: User-specific data

## Security Features

### Data Protection
- **SQL Injection**: Parameterized queries via TypeORM
- **XSS Protection**: Input sanitization
- **JWT Security**: Token expiration and refresh
- **CORS Configuration**: Cross-origin request handling

### Tenant Isolation
- **Business ID Filtering**: All queries isolated by tenant
- **Route Guards**: Permission-based access control
- **Data Segregation**: Complete tenant separation

## Development Workflow

### Environment Setup
```bash
# Install dependencies
npm install

# Environment variables
cp .env.example .env

# Database setup
npm run migration:run

# Development server
npm run start:dev
```

### Testing Strategy
```bash
# Unit tests
npm run test

# Integration tests  
npm run test:e2e

# Coverage reports
npm run test:cov
```

## Deployment

### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
PORT=4001
```

## Monitoring & Logging

### Request/Response Logging
```typescript
// Automatic request/response logging
📥 REQUEST: { method, url, body, timestamp }
📤 RESPONSE: { statusCode, duration, response }
```

### Error Tracking
- **Stack Traces**: Full error context
- **Request Context**: User, tenant, endpoint
- **Performance Metrics**: Response times, query counts

## API Documentation

### Swagger Integration
```typescript
// Auto-generated API docs
http://localhost:4001/api/docs

// Decorators for documentation
@ApiTags('Module Name')
@ApiOperation({ summary: 'Description' })
@ApiBearerAuth()
```

## Migration & Versioning

### Database Migrations
```bash
# Generate migration
npm run migration:generate -- MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### API Versioning
- **URL Versioning**: `/api/v1/resource`
- **Header Versioning**: `Accept-Version: v1`
- **Backward Compatibility**: Maintain older versions during transitions

## Troubleshooting

### Common Issues
1. **Database Connection**: Check DATABASE_URL and network
2. **Authentication Failures**: Verify JWT_SECRET configuration
3. **Permission Errors**: Check user roles and permissions
4. **Bulk Upload Failures**: Validate CSV format and data integrity

### Debug Tools
- **Logging**: Structured logs with request tracing
- **Database Queries**: TypeORM query logging
- **Performance Profiling**: Request timing analysis
- **Health Checks**: System status endpoints

## Future Enhancements

### Planned Features
- **GraphQL API**: Alternative to REST
- **Event Sourcing**: Audit trail and event replay
- **Message Queues**: Async task processing
- **Microservices**: Service decomposition
- **API Rate Limiting**: Request throttling
- **Advanced Analytics**: Real-time reporting
