# Frontend Documentation - ERP System v2

## Overview
The frontend is built with **Next.js**, **React**, **TypeScript**, and **Tailwind CSS**. It provides a responsive, multi-tenant web application with role-based access control and comprehensive business management features.

## Technology Stack

### Core Framework
- **Next.js 13+** - React framework with SSR/SSG
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **next-i18next** - Internationalization
- **Docker** - Containerized deployment

### State Management
- **React Hooks** - Local state management
- **Context API** - Global state sharing
- **Custom Hooks** - Reusable logic

## Project Structure

```
frontend/
├── components/          # Reusable UI components
├── lib/                # Utility libraries
├── pages/              # Next.js pages (file-based routing)
├── public/             # Static assets
├── store/              # Global state management
├── styles/             # Global CSS and Tailwind
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Architecture

### Page Structure
```
pages/
├── _app.tsx           # App wrapper with providers
├── _document.tsx      # HTML document structure
├── index.tsx          # Dashboard homepage
├── login.tsx          # Authentication
├── register.tsx       # User registration
├── auth/              # Authentication flows
├── ims/               # Inventory Management
├── rms/               # Restaurant Management
├── hrms/              # Human Resources
├── settings/          # System configuration
└── profile/           # User profile
```

### Component Architecture
```
components/
├── Layout.tsx         # Main app layout
├── AppHeader.tsx      # Top navigation
├── AppSidebar.tsx     # Side navigation
├── Modal.tsx          # Reusable modal
├── Toast.tsx          # Notification system
├── Card.tsx           # Content containers
├── Pagination.tsx     # Data pagination
└── forms/             # Form components
```

## Core Components

### 1. Layout System

#### Layout.tsx
```typescript
// Main application layout wrapper
- Responsive design for mobile/desktop
- Sidebar navigation with role-based menu
- Header with user info and notifications
- Multi-tenant context switching
```

#### AppHeader.tsx
```typescript
// Top navigation bar
- User profile dropdown
- Language switcher
- Service/tenant switcher
- Breadcrumb navigation
- Real-time notifications
```

#### AppSidebar.tsx
```typescript
// Side navigation menu
- Role-based menu items
- Collapsible sections
- Active state indicators
- Permission-based visibility
```

### 2. Authentication System

#### Login/Register Pages
```typescript
// Location: pages/auth/
- JWT token management
- Multi-tenant login
- Form validation with error handling
- Redirect after authentication
- Remember me functionality
```

#### Permission Guards
```typescript
// Component: PermissionGuard.tsx
- Route-level access control
- Feature-level permissions
- Graceful permission denial
- Loading states during auth check
```

#### Auth Context
```typescript
// Store: authStore.ts
- User session management
- Token refresh handling
- Role and permission caching
- Logout functionality
```

## Module Details

### 1. Inventory Management System (`ims/`)

#### Pages Structure
```
ims/
├── inventory/
│   ├── index.tsx      # Inventory list & stock levels
│   └── create.tsx     # Add new inventory items
├── categories/
│   ├── index.tsx      # Category management
│   └── create.tsx     # Create categories
├── inflows/
│   ├── index.tsx      # Inflow history with batch tracking
│   ├── create.tsx     # Manual inflow entry
│   └── [id].tsx       # Inflow details view
└── suppliers/
    ├── index.tsx      # Supplier list
    └── create.tsx     # Add suppliers
```

#### Key Features

##### Inventory Management
```typescript
// Location: pages/ims/inventory/
- Real-time stock levels per branch
- Multi-UOM display and conversion
- Low stock alerts and indicators
- Category-based filtering
- Search and pagination
- Bulk operations support
```

##### Inflow Management
```typescript
// Location: pages/ims/inflows/
- Batch tracking with clickable batch IDs
- Branch-specific inflow display
- Failed upload count per branch
- CSV bulk upload with validation
- Manual inflow creation
- Inflow approval workflow
```

##### CSV Bulk Upload
```typescript
// Component: BulkUpload modal
- Drag & drop CSV upload
- Real-time validation feedback
- Progress tracking
- Error reporting per row
- Template download
- Batch processing results
```

#### UI Components

##### InventoryItemForm.tsx
```typescript
// Reusable inventory item form
- Multi-step form validation
- UOM selection and conversion
- Category assignment
- Branch-specific settings
- Image upload support
```

##### Inflow Display
```typescript
// Features:
- 6-character batch ID display (e.g., A1B2C3)
- Clickable batch filtering
- Branch name with fallback handling
- Failed upload count with color coding
- Invoice number truncation with hover
- Date/time formatting
```

### 2. Restaurant Management System (`rms/`)

#### Pages Structure
```
rms/
├── orders/
│   ├── index.tsx      # Sales orders list
│   ├── create.tsx     # New order creation
│   └── [id].tsx       # Order details & profit analysis
├── tables/
│   ├── index.tsx      # Table management
│   └── create.tsx     # Add tables
└── suppliers/
    ├── index.tsx      # Supplier management
    └── create.tsx     # Add suppliers
```

#### Key Features

##### Order Management
```typescript
// Location: pages/rms/orders/
- Real-time order creation
- Multi-branch order tracking
- Payment processing integration
- Order status management
- Customer information capture
- Table assignment
```

##### Profit Analysis
```typescript
// Order details view:
- Cost vs Revenue comparison
- Profit margin calculations  
- Batch-level cost breakdown
- FIFO cost allocation display
- Profitability metrics
- Export capabilities
```

##### Sales Cost Display
```typescript
// Enhanced cost calculation:
- Primary: item.costTotal
- Fallback: unitCost * quantity
- Alternative: cost or costPrice fields
- Zero-cost prevention logic
- Profit color coding (green/red)
```

### 3. Human Resources (`hrms/`)

#### Pages Structure
```
hrms/
├── employees/
│   ├── index.tsx      # Employee directory
│   ├── create.tsx     # Add employees
│   └── [id].tsx       # Employee profile
├── departments/
│   └── index.tsx      # Department management
├── leave-types/
│   └── index.tsx      # Leave category setup
└── leaves/
    ├── index.tsx      # Leave applications
    └── create.tsx     # Apply for leave
```

#### Key Features
- Employee lifecycle management
- Department organization
- Leave application workflow
- Employee profile management
- Role assignment interface

### 4. Settings (`settings/`)

#### Pages Structure
```
settings/
├── index.tsx          # General settings
├── branches/
│   ├── index.tsx      # Branch management
│   └── create.tsx     # Add branches
├── roles/
│   ├── index.tsx      # Role management
│   └── create.tsx     # Create roles
└── users/
    ├── index.tsx      # User management
    └── invitations.tsx # User invitations
```

#### Key Features
- Multi-branch configuration
- Role-based permission management
- User invitation system
- System-wide settings
- Business profile management

## Common UI Patterns

### 1. Data Tables

#### Standard Table Structure
```typescript
// Common pattern across all modules:
- Sortable headers
- Search and filtering
- Pagination controls
- Bulk action support
- Export functionality
- Responsive design
```

#### Table Features
```typescript
// Components used:
- Pagination.tsx: Consistent pagination
- SearchableSelect.tsx: Advanced filtering
- Loading states with skeletons
- Empty states with actions
- Error boundaries
```

### 2. Forms

#### Form Components
```typescript
// Reusable form elements:
- Input validation with error display
- DatePicker.tsx: Date selection
- SearchableSelect.tsx: Dropdown with search
- File upload with progress
- Multi-step forms
```

#### Validation Strategy
```typescript
// Form validation approach:
- Real-time validation feedback
- Server-side validation integration
- Error message display
- Success state handling
- Loading states during submission
```

### 3. Navigation

#### Responsive Navigation
```typescript
// Navigation features:
- Mobile hamburger menu
- Desktop sidebar navigation
- Breadcrumb trails
- Active state indicators
- Permission-based menu items
```

## State Management

### 1. Global State

#### Auth Store
```typescript
// store/authStore.ts
- User session management
- Permission caching
- Token refresh logic
- Multi-tenant context
```

#### Local State Patterns
```typescript
// Common hooks usage:
useState() - Component state
useEffect() - Side effects
useContext() - Shared state
Custom hooks - Reusable logic
```

### 2. Data Fetching

#### API Integration
```typescript
// lib/api.ts
- Centralized API client
- Automatic token attachment
- Error handling middleware
- Request/response interceptors
- Base URL configuration
```

#### Data Fetching Patterns
```typescript
// Common patterns:
- Loading states
- Error boundaries
- Optimistic updates
- Cache invalidation
- Pagination handling
```

## Styling System

### 1. Tailwind CSS

#### Design System
```typescript
// Consistent styling approach:
- Color palette: Primary, secondary, accent
- Typography: Heading, body, caption styles
- Spacing: Consistent margin/padding scale
- Border radius: Rounded corners
- Shadows: Depth and elevation
```

#### Responsive Design
```typescript
// Breakpoint strategy:
- Mobile-first approach
- sm: 640px (small tablets)
- md: 768px (tablets)  
- lg: 1024px (laptops)
- xl: 1280px (desktops)
```

### 2. Dark Mode Support

#### Theme Implementation
```typescript
// Dark mode features:
- System preference detection
- Manual theme switching
- Persistent theme storage
- Smooth transitions
- Component-level theming
```

## Internationalization

### 1. Language Support

#### i18n Setup
```typescript
// next-i18next configuration:
- Multiple language support
- Namespace organization
- Dynamic language switching
- Missing translation fallbacks
- Pluralization rules
```

#### Translation Structure
```
public/locales/
├── en/
│   ├── common.json    # Common UI elements
│   ├── ims.json       # Inventory terms
│   ├── rms.json       # Restaurant terms
│   └── hrms.json      # HR terms
└── [other-languages]/
```

## Performance Optimization

### 1. Next.js Features

#### Optimization Techniques
```typescript
// Performance features used:
- Image optimization with next/image
- Code splitting with dynamic imports
- Static generation where possible
- API route optimization
- Bundle analysis and optimization
```

### 2. React Optimization

#### Performance Patterns
```typescript
// React optimizations:
- Memoization with useMemo/useCallback
- Component lazy loading
- Virtual scrolling for large lists
- Optimistic UI updates
- Debounced search inputs
```

## Error Handling

### 1. Error Boundaries

#### Error Management
```typescript
// Error handling strategy:
- Component-level error boundaries
- Global error handling
- User-friendly error messages
- Error reporting and logging
- Graceful degradation
```

### 2. Loading States

#### User Experience
```typescript
// Loading state patterns:
- Skeleton screens
- Progress indicators
- Optimistic updates
- Error retry mechanisms
- Timeout handling
```

## Development Workflow

### 1. Environment Setup

#### Development Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

### 2. Code Quality

#### Quality Tools
```typescript
// Development tools:
- TypeScript strict mode
- ESLint configuration
- Prettier code formatting
- Husky git hooks
- Automated testing
```

## Testing Strategy

### 1. Component Testing

#### Testing Approach
```typescript
// Testing patterns:
- Unit tests for components
- Integration tests for pages
- E2E tests for critical flows
- Accessibility testing
- Performance testing
```

## Deployment

### 1. Docker Configuration

#### Container Setup
```dockerfile
# Multi-stage build optimization
- Development dependencies removal
- Static asset optimization
- Environment variable injection
- Health check endpoints
```

### 2. Environment Configuration

#### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_APP_NAME=ERP System
NEXTAUTH_SECRET=your-secret-key
```

## Browser Support

### 1. Compatibility

#### Supported Browsers
```typescript
// Target browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)
```

### 2. Progressive Enhancement

#### Feature Support
```typescript
// Progressive features:
- Service worker for offline support
- Push notifications
- File system access API
- WebRTC for real-time features
- Local storage for caching
```

## Security Features

### 1. Client-Side Security

#### Security Measures
```typescript
// Security implementations:
- XSS protection with input sanitization
- CSRF protection
- Secure cookie handling
- Content Security Policy
- Input validation
```

### 2. Authentication Flow

#### Auth Security
```typescript
// Authentication features:
- JWT token management
- Automatic token refresh
- Secure logout
- Session timeout
- Route protection
```

## Monitoring & Analytics

### 1. Performance Monitoring

#### Metrics Tracking
```typescript
// Performance monitoring:
- Core Web Vitals tracking
- Error rate monitoring
- User interaction analytics
- Page load performance
- API response times
```

## Future Enhancements

### 1. Planned Features

#### Roadmap Items
```typescript
// Upcoming features:
- Progressive Web App (PWA)
- Real-time notifications
- Advanced analytics dashboard
- Mobile app with React Native
- Offline functionality
- Advanced search with filters
```

### 2. Technical Improvements

#### Optimization Plans
```typescript
// Technical roadmap:
- GraphQL integration
- State management with Redux Toolkit
- Component library extraction
- Micro-frontend architecture
- Advanced caching strategies
```
