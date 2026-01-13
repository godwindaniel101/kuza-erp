# KUZA ERP System v2 - Complete Technical System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Modules & Functionality](#modules--functionality)
5. [Technical Implementation](#technical-implementation)
6. [Integration & Workflows](#integration--workflows)
7. [Security & Performance](#security--performance)
8. [Deployment & Operations](#deployment--operations)

## System Overview

### Purpose
A comprehensive Enterprise Resource Planning (ERP) system designed for restaurants and hospitality businesses, providing integrated management of inventory, sales, human resources, and operations across multiple locations.

### Key Characteristics
- **Multi-Tenant Architecture**: Complete data isolation per business
- **Multi-Branch Support**: Centralized management of multiple locations
- **Real-time Operations**: Live inventory tracking and sales processing
- **Role-Based Access**: Granular permission system
- **Scalable Design**: Containerized microservice-ready architecture

### Technology Stack
```
Frontend:  Next.js + React + TypeScript + Tailwind CSS
Backend:   NestJS + TypeScript + PostgreSQL + TypeORM
Container: Docker + Docker Compose
Security:  JWT Authentication + Permission Guards
```

## Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │     IMS     │ │     RMS     │ │    HRMS + Settings      │ │
│  │  Inventory  │ │ Restaurant  │ │   HR + Configuration    │ │
│  │ Management  │ │ Management  │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                       REST APIs
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ IMS Module  │ │ RMS Module  │ │   HRMS + Auth Modules   │ │
│  │             │ │             │ │                         │ │
│  │ Controllers │ │ Controllers │ │      Controllers        │ │
│  │ Services    │ │ Services    │ │      Services           │ │
│  │ Entities    │ │ Entities    │ │      Entities           │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                     Database Layer
                            │
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                          │
│                                                             │
│  Multi-Tenant Data Model with Business ID Isolation        │
│  - Inventory Data    - Sales Data    - HR Data             │
│  - User Management   - Settings      - Audit Logs          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture
```
User Request → Frontend → API Gateway → Backend Service → Database
     ↓              ↓            ↓             ↓             ↓
UI Validation → Route Guard → Auth Guard → Business Logic → Data Access
     ↓              ↓            ↓             ↓             ↓
User Feedback ← UI Update ← API Response ← Service Result ← Query Result
```

## Core Features

### 1. Authentication & Authorization System

#### Multi-Tenant Authentication
```typescript
// User login process with tenant isolation
1. User provides credentials
2. System validates against specific tenant
3. JWT token issued with business context
4. All subsequent requests isolated by business ID
```

#### Permission Framework
```typescript
// Granular permission system
Permissions: "module.action" 
Examples:
- "inflows.create"      // Create inventory inflows
- "orders.view"         // View sales orders  
- "employees.edit"      // Edit employee data
- "settings.manage"     // Manage system settings
```

#### Role-Based Access Control
```typescript
// Role hierarchy and assignment
Super Admin → Business Admin → Manager → Employee → Limited User
    ↓              ↓           ↓         ↓           ↓
All Access    Full Business  Department  Basic     Read-only
```

### 2. Multi-Branch Management

#### Branch Architecture
```typescript
// Branch-centric data organization
Business
├── Branch A (Victoria Island)
│   ├── Inventory Stock Levels
│   ├── Sales Orders
│   ├── Employee Assignments
│   └── Local Settings
├── Branch B (Lekki)
│   ├── Independent Stock
│   ├── Separate Sales
│   ├── Branch Staff
│   └── Custom Configuration
└── Central Management
    ├── Consolidated Reporting
    ├── Inter-branch Transfers
    ├── Global Settings
    └── Master Data
```

## Modules & Functionality

### 1. Inventory Management System (IMS)

#### 1.1 Core Inventory Features

##### Inventory Item Master Data
```typescript
Features:
- Product catalog with categories and subcategories
- Multi-UOM support (bottles, cases, liters, etc.)
- Automatic UOM conversions
- Barcode management
- Pricing and cost tracking
- Minimum/maximum stock levels
- Branch-specific availability
```

##### Stock Level Management
```typescript
Real-time Stock Tracking:
- Branch-specific stock levels
- Automatic stock updates on sales/inflows
- Low stock alerts and notifications
- Stock valuation using weighted average cost
- Historical stock movement tracking
- Cycle count support
```

#### 1.2 Inflow Management System

##### Manual Inflows
```typescript
Features:
- Single item or multi-item inflows
- Supplier selection and auto-creation
- Invoice number generation (XXX-XXXX-XXXX format)
- Expiry date tracking
- Batch number assignment
- Cost per unit recording
- Branch-specific receiving
```

##### Bulk CSV Upload System
```typescript
Advanced Bulk Processing:
1. CSV Template Generation
   - Downloadable templates with proper headers
   - Example data for user guidance
   
2. Upload Validation
   - Header validation (Branch Name, Item Name, UOM, Quantity, Cost)
   - Data type validation
   - Entity existence checking (branches, items, suppliers, UOMs)
   
3. Processing Pipeline
   - Parse CSV rows with error tracking
   - Entity lookup and validation
   - UOM conversion to base units
   - Group by branch for separate inflows
   - Generate unique 6-character batch IDs (e.g., A1B2C3)
   
4. Error Management
   - Line-by-line error tracking
   - Branch-specific failed upload counts
   - Detailed error messages and suggestions
   - Partial success handling
   
5. Batch Tracking
   - Unique batch IDs for traceability
   - Clickable batch filtering in UI
   - Batch-based reporting and analysis
```

##### Supplier Auto-Creation
```typescript
Intelligent Supplier Management:
- Automatic supplier creation during bulk uploads
- Duplicate prevention using name matching
- Basic supplier profile generation
- Integration with existing supplier database
- Audit trail for auto-created suppliers
```

#### 1.3 Advanced Features

##### UOM Conversion System
```typescript
Multi-Unit Support:
- Base UOM definition per item
- Conversion factor setup (1 case = 24 bottles)
- Automatic conversion during transactions
- Display flexibility (show in any valid UOM)
- Inventory accuracy across different units
```

##### Inventory Valuation
```typescript
Cost Management:
- Weighted average cost calculation
- FIFO (First-In-First-Out) cost allocation
- Cost tracking per batch/lot
- Profit margin analysis
- Cost variance reporting
```

### 2. Restaurant Management System (RMS)

#### 2.1 Sales Order Management

##### Order Creation Process
```typescript
Order Workflow:
1. Table/Customer Selection
   - Table assignment (for dine-in)
   - Customer information capture
   - Order type selection (dine-in, takeaway, delivery)

2. Item Selection & Pricing
   - Menu item selection
   - Quantity specification
   - Price calculation with modifiers
   - Special instructions capture

3. Inventory Validation
   - Real-time stock availability check
   - Multi-branch inventory lookup
   - Alternative item suggestions

4. Order Finalization
   - Order total calculation
   - Tax and service charge application
   - Payment method selection
   - Order confirmation
```

##### FIFO Inventory Allocation
```typescript
Advanced Stock Allocation:
1. Stock Availability Check
   - Check branch-specific stock levels
   - Identify available batches/lots
   
2. FIFO Selection Logic
   - Sort available stock by received date
   - Allocate oldest stock first
   - Handle partial allocations
   
3. Cost Calculation
   - Use actual cost from allocated batches
   - Calculate weighted average for mixed batches
   - Track cost basis for profit analysis
   
4. Inventory Update
   - Reduce stock levels atomically
   - Update branch inventory records
   - Create audit trail for stock movements
```

#### 2.2 Profit Analysis System

##### Real-time Profitability
```typescript
Profit Calculation Engine:
1. Revenue Tracking
   - Item-level sales prices
   - Total order value
   - Discount and promotion impact
   
2. Cost Analysis
   - Actual cost from FIFO allocation
   - Overhead allocation (optional)
   - Labor cost integration (future)
   
3. Profit Metrics
   - Gross profit per item
   - Order-level profitability
   - Profit margin percentages
   - Contribution analysis
   
4. Reporting & Analytics
   - Profit trends over time
   - Item profitability ranking
   - Branch performance comparison
```

#### 2.3 Enhanced Sales Features

##### Multi-Payment Support
```typescript
Payment Options:
- Cash payments with change calculation
- Card payments (credit/debit)
- Mobile payments integration
- Split payment handling
- Payment status tracking
```

##### Order Management
```typescript
Order Lifecycle:
- Order creation and modification
- Kitchen order management (future)
- Order fulfillment tracking
- Customer communication
- Order history and reprinting
```

### 3. Human Resource Management System (HRMS)

#### 3.1 Employee Management

##### Employee Lifecycle
```typescript
Complete HR Management:
1. Employee Onboarding
   - Personal information capture
   - Document management
   - Department assignment
   - Role and permission setup
   
2. Employee Records
   - Contact information management
   - Emergency contact details
   - Employment history
   - Performance tracking
   
3. Department Organization
   - Department hierarchy
   - Manager assignments
   - Team structure
   - Cross-department collaboration
```

#### 3.2 Leave Management System

##### Leave Types & Policies
```typescript
Leave Management:
- Configurable leave types (annual, sick, personal)
- Leave balance tracking
- Approval workflow
- Leave calendar integration
- Reporting and analytics
```

### 4. Settings & Configuration

#### 4.1 Business Configuration

##### Multi-Branch Setup
```typescript
Branch Management:
- Branch registration and setup
- Location and contact details
- Operating hours configuration
- Branch-specific settings
- Inter-branch relationships
```

##### System Settings
```typescript
Global Configuration:
- Business profile management
- Currency and localization
- Tax rate configuration
- Email and notification settings
- Backup and maintenance schedules
```

#### 4.2 User Management

##### User Administration
```typescript
User Lifecycle:
- User invitation system
- Role assignment and modification
- Permission management
- User activation/deactivation
- Session management
```

## Technical Implementation

### 1. Database Design

#### Entity Relationship Model
```sql
-- Core Business Entities
Business (1) → (*) Branch
Business (1) → (*) User
Business (1) → (*) InventoryItem

-- Inventory Flow
InventoryItem (1) → (*) InventoryInflowItem
InventoryItem (1) → (*) BranchInventoryItem
Branch (1) → (*) InventoryInflow
InventoryInflow (1) → (*) InventoryInflowItem

-- Sales Flow
Branch (1) → (*) Order
Order (1) → (*) OrderItem
OrderItem (*) → (*) InventoryInflowItem (via OrderItemInflowItem)

-- HR Relationships
Branch (1) → (*) Employee
Employee (1) → (*) Leave
Department (1) → (*) Employee
```

#### Multi-Tenant Data Isolation
```sql
-- Every table includes businessId for tenant isolation
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL,
    name VARCHAR NOT NULL,
    -- other fields
    CONSTRAINT fk_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Automatic filtering in all queries
SELECT * FROM inventory_items WHERE business_id = :tenantId;
```

### 2. API Architecture

#### RESTful API Design
```typescript
// Standard resource endpoints
GET    /api/ims/inventory          # List inventory items
POST   /api/ims/inventory          # Create new item
GET    /api/ims/inventory/:id      # Get specific item
PATCH  /api/ims/inventory/:id      # Update item
DELETE /api/ims/inventory/:id      # Delete item

// Specialized endpoints
POST   /api/ims/inflows/bulk-upload  # Bulk CSV upload
GET    /api/ims/inflows/template     # Download CSV template
POST   /api/rms/orders/:id/pay       # Process payment
GET    /api/dashboard/stats          # Dashboard analytics
```

#### Request/Response Patterns
```typescript
// Standardized response format
{
  success: boolean,
  data: any,
  message?: string,
  errors?: string[]
}

// Error handling
{
  success: false,
  errors: [
    "Inventory item 'Beer' not found",
    "Invalid quantity: must be positive number"
  ],
  data: null
}
```

### 3. Frontend Architecture

#### Component Hierarchy
```typescript
// Page-level components
_app.tsx
├── Layout.tsx
│   ├── AppHeader.tsx
│   └── AppSidebar.tsx
├── PermissionGuard.tsx
└── Page Components
    ├── Table Components
    ├── Form Components
    └── Modal Components
```

#### State Management Patterns
```typescript
// Local state for UI interactions
const [loading, setLoading] = useState(false);
const [formData, setFormData] = useState({});

// Global state for auth and shared data
const { user, permissions } = useAuth();
const { selectedBranch } = useBranch();

// API state management
const { data, loading, error } = useAPI('/api/inventory');
```

## Integration & Workflows

### 1. End-to-End Business Workflows

#### Complete Inventory-to-Sales Flow
```typescript
1. Inventory Setup
   ├── Create inventory categories
   ├── Add inventory items with UOMs
   ├── Set up suppliers
   └── Configure branch locations

2. Stock Receiving (Inflows)
   ├── Manual entry or CSV bulk upload
   ├── Supplier assignment (auto-create if needed)
   ├── Generate batch IDs for traceability  
   ├── Update branch inventory levels
   └── Calculate weighted average costs

3. Sales Processing
   ├── Create sales orders
   ├── Validate inventory availability
   ├── Allocate stock using FIFO method
   ├── Calculate actual costs and profits
   ├── Update inventory levels
   └── Generate sales receipts

4. Reporting & Analysis
   ├── Real-time inventory levels
   ├── Sales performance metrics
   ├── Profit analysis by item/branch
   ├── Stock movement reports
   └── Low stock alerts
```

#### Bulk Upload Workflow
```typescript
CSV Upload Process:
1. User downloads template
2. Fills CSV with inventory data
3. Uploads through web interface
4. System validates all data
5. Creates suppliers automatically if needed
6. Generates batch ID for traceability
7. Creates separate inflows per branch
8. Reports success/failure per row
9. Updates inventory levels
10. Enables batch-based filtering and reporting
```

### 2. Cross-Module Integrations

#### IMS-RMS Integration
```typescript
Inventory-Sales Integration:
- Real-time stock availability for order taking
- Automatic inventory deduction on order completion
- Cost basis transfer from inflows to sales
- Profit calculation using actual inventory costs
- Stock alerts when inventory falls below minimums
```

#### User-Role Integration
```typescript
Permission-based Feature Access:
- Menu items show/hide based on permissions
- API endpoints protected by role guards
- Branch access restricted by assignment
- Data filtering by user access level
```

## Security & Performance

### 1. Security Framework

#### Authentication Security
```typescript
JWT Security Implementation:
- Secure token generation with configurable expiration
- Automatic token refresh before expiration
- Secure logout with token invalidation
- Multi-device session management
- Brute force protection
```

#### Data Security
```typescript
Multi-layered Protection:
1. Network Level
   - HTTPS enforcement
   - CORS policy configuration
   - Rate limiting on API endpoints
   
2. Application Level
   - Input validation and sanitization
   - SQL injection prevention via ORM
   - XSS protection in frontend
   - CSRF token protection
   
3. Database Level
   - Tenant data isolation
   - Encrypted sensitive fields
   - Audit logging for all changes
   - Regular backup schedules
```

### 2. Performance Optimization

#### Database Performance
```typescript
Query Optimization:
- Strategic indexing on business_id and foreign keys
- Query result caching for frequently accessed data
- Connection pooling for efficient resource usage
- Pagination for large datasets
- Eager/lazy loading based on use case
```

#### Frontend Performance
```typescript
UI Optimization:
- Code splitting for module-based loading
- Image optimization with Next.js
- Debounced search inputs
- Virtual scrolling for large tables
- Optimistic UI updates
- Progressive loading states
```

## Deployment & Operations

### 1. Containerization Strategy

#### Docker Architecture
```dockerfile
# Multi-service Docker Compose setup
services:
  frontend:
    - Next.js production build
    - Nginx reverse proxy
    - Static asset optimization
    
  backend:
    - NestJS Node.js application
    - Production dependencies only
    - Health check endpoints
    
  database:
    - PostgreSQL with persistent volumes
    - Automated backups
    - Performance monitoring
```

### 2. Environment Management

#### Configuration Management
```bash
# Environment-specific configurations
Development: .env.development
Staging:     .env.staging  
Production:  .env.production

# Key variables
DATABASE_URL=postgresql://...
JWT_SECRET=secure-secret-key
NEXT_PUBLIC_API_URL=https://api.domain.com
```

### 3. Monitoring & Logging

#### Application Monitoring
```typescript
Comprehensive Logging:
- Request/response logging with timing
- Error tracking with stack traces
- User action audit trails
- System performance metrics
- Database query performance
- Business metrics tracking
```

#### Health Checks
```typescript
System Health Monitoring:
- Database connectivity checks
- API endpoint availability
- Memory and CPU usage
- Disk space monitoring
- Application error rates
```

## System Benefits & Outcomes

### 1. Business Value

#### Operational Efficiency
- **50%+ reduction** in inventory management time through bulk uploads
- **Real-time visibility** into stock levels across all branches
- **Automated cost calculation** eliminating manual profit analysis
- **Streamlined workflows** from purchase to sale to reporting

#### Financial Control
- **Accurate profit tracking** with FIFO cost allocation
- **Real-time financial insights** with instant profit calculation
- **Cost optimization** through inventory analysis and reporting
- **Reduced waste** through better stock management and alerts

#### Scalability Benefits
- **Multi-tenant architecture** supporting unlimited businesses
- **Multi-branch capability** for business expansion
- **Role-based permissions** for team management
- **Audit trails** for compliance and accountability

### 2. Technical Excellence

#### Development Efficiency  
- **Type-safe development** with TypeScript across full stack
- **Reusable components** reducing development time
- **Automated testing** ensuring code quality
- **Docker deployment** for consistent environments

#### Maintainability
- **Modular architecture** enabling feature-specific updates
- **Clear separation of concerns** between frontend and backend
- **Comprehensive documentation** for ongoing development
- **Version control** and deployment automation

## Future Roadmap

### 1. Immediate Enhancements (Next 3 months)
- **Advanced Reporting Dashboard** with charts and analytics
- **Mobile App Development** using React Native
- **Real-time Notifications** for critical business events
- **Advanced Search** with filtering and sorting

### 2. Medium-term Goals (3-12 months)  
- **Kitchen Display System** for order management
- **Customer Portal** for order history and loyalty
- **Accounting Integration** with popular accounting software
- **Advanced Analytics** with predictive insights

### 3. Long-term Vision (1+ years)
- **AI-powered Demand Forecasting** for inventory optimization
- **IoT Integration** for automated inventory tracking
- **Marketplace Integration** for online ordering
- **Franchise Management** tools for multi-location businesses

This ERP system represents a comprehensive, scalable solution that grows with business needs while maintaining operational efficiency and financial control. The technical architecture ensures reliability, security, and performance at scale.
