/**
 * Shared TypeScript Types for ERP Platform V2
 * Used across Backend, Frontend, and Mobile
 */

// ============================================
// Core Types
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  businessId?: string;
  employeeId?: string;
  roles: Role[];
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  group: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// RMS Types
// ============================================

export interface Menu {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  qrCode?: string;
  categories: MenuCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  menuId: string;
  categoryId?: string;
  inventoryItemId?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  businessId: string;
  branchId: string;
  tableId?: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  payments: OrderPayment[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  uomId?: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface Table {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  capacity: number;
  status: TableStatus;
  qrCode?: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

// ============================================
// IMS Types
// ============================================

export interface InventoryItem {
  id: string;
  businessId: string;
  name: string;
  category: string;
  subcategory?: string;
  baseUomId: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unitCost: number;
  salePrice: number;
  barcode?: string;
  isTrackable: boolean;
  branches: BranchInventoryItem[];
  batches: InventoryBatch[];
}

export interface BranchInventoryItem {
  id: string;
  branchId: string;
  inventoryItemId: string;
  currentStock: number;
  salePrice: number;
  minimumStock: number;
  maximumStock: number;
}

export interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  supplierId?: string;
  businessId: string;
  inputUomId: string;
  quantity: number;
  remainingQuantity: number;
  costPerUnit: number;
  inputQuantity: number;
  inputCostPerUnit: number;
  receivedAt: Date;
  batchNumber: string;
  notes?: string;
}

export interface InventoryInflow {
  id: string;
  businessId: string;
  branchId: string;
  inventoryItemId: string;
  supplierId?: string;
  batchId?: string;
  receivedBy: string;
  inputUomId: string;
  quantity: number;
  costPerUnit: number;
  inputQuantity: number;
  inputCostPerUnit: number;
  receivedAt: Date;
  invoiceNumber?: string;
  notes?: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  batchId?: string;
  type: TransactionType;
  quantity: number;
  unitCost?: number;
  notes?: string;
  userId?: string;
  createdAt: Date;
}

export type TransactionType = 'purchase' | 'usage' | 'adjustment' | 'waste';

export interface Uom {
  id: string;
  businessId: string;
  name: string;
  abbreviation: string;
  isDefault: boolean;
}

export interface UomConversion {
  id: string;
  businessId: string;
  fromUomId: string;
  toUomId: string;
  multiplier: number;
  effectiveFrom: Date;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// ============================================
// HRMS Types
// ============================================

export interface Employee {
  id: string;
  userId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  hireDate: Date;
  originalHireDate?: Date;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  terminationDate?: Date;
  terminationReason?: string;
  departmentId?: string;
  positionId?: string;
  locationId?: string;
  managerId?: string;
  costCenterId?: string;
  profilePhotoPath?: string;
  customFields?: Record<string, any>;
  department?: Department;
  position?: Position;
  location?: Location;
  manager?: Employee;
  directReports?: Employee[];
}

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'consultant';

export interface Department {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  managerId?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Position {
  id: string;
  title: string;
  description?: string;
  departmentId?: string;
  salaryBandId?: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  isActive: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  entryDate: Date;
  clockIn?: Date;
  clockOut?: Date;
  totalHours?: number;
  overtimeHours?: number;
  regularHours?: number;
  status: TimeEntryStatus;
  entryType: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  approvedBy?: string;
  approvedAt?: Date;
}

export type TimeEntryStatus = 'pending' | 'approved' | 'rejected';

export interface Timesheet {
  id: string;
  employeeId: string;
  weekStartDate: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: TimesheetStatus;
  approvedBy?: string;
  approvedAt?: Date;
}

export type TimesheetStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  maxDaysPerYear?: number;
  accrues: boolean;
  accrualRate?: number;
  accrualFrequency: AccrualFrequency;
  carryOverAllowed: boolean;
  maxCarryOverDays?: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  halfDayAllowed: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type AccrualFrequency = 'monthly' | 'bi-weekly' | 'weekly';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  isHalfDay: boolean;
  reason?: string;
  status: LeaveRequestStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  attachment?: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  balance: number;
  accrued: number;
  used: number;
  year: number;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  payScheduleId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  status: PayrollStatus;
  totalEmployees: number;
  totalAmount: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  items: PayrollItem[];
}

export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'processed';

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: number;
  totalDeductions: number;
  taxAmount: number;
  netPay: number;
}

export interface JobRequisition {
  id: string;
  requisitionNumber: string;
  title: string;
  description: string;
  departmentId: string;
  positionId: string;
  locationId?: string;
  hiringManagerId?: string;
  numberOfPositions: number;
  employmentType: EmploymentType;
  priority: Priority;
  status: RequisitionStatus;
  targetStartDate: Date;
  deadline?: Date;
  requiredSkills?: string[];
  preferredQualifications?: string[];
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'on_hold';

export interface Job {
  id: string;
  requisitionId?: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  departmentId?: string;
  positionId?: string;
  locationId?: string;
  employmentType: EmploymentType;
  status: JobStatus;
  closingDate?: Date;
  slug: string;
  applicationCount: number;
}

export type JobStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  resumePath?: string;
  coverLetterPath?: string;
  source?: string;
  referredBy?: string;
  notes?: string;
  tags?: string[];
}

export interface Application {
  id: string;
  applicationNumber: string;
  jobId: string;
  candidateId: string;
  pipelineStageId?: string;
  status: ApplicationStatus;
  coverLetter?: string;
  screeningAnswers?: Record<string, any>;
  score?: number;
  appliedAt: Date;
  lastActivityAt: Date;
  assignedTo?: string;
}

export type ApplicationStatus = 'applied' | 'screening' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';

export interface Interview {
  id: string;
  applicationId: string;
  interviewType: InterviewType;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  timezone: string;
  location?: string;
  meetingLink?: string;
  status: InterviewStatus;
  instructions?: string;
  createdBy: string;
}

export type InterviewType = 'phone_screen' | 'video' | 'onsite' | 'panel' | 'technical' | 'final';
export type InterviewStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  progressPercentage: number;
  dueDate?: Date;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export interface Review {
  id: string;
  employeeId: string;
  reviewCycleId: string;
  reviewPeriodStart: Date;
  reviewPeriodEnd: Date;
  status: ReviewStatus;
  selfReview?: string;
  managerReview?: string;
  overallRating?: number;
  completedAt?: Date;
}

export type ReviewStatus = 'draft' | 'self_review' | 'manager_review' | 'completed';

export interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  duration?: number;
  isActive: boolean;
  isMandatory: boolean;
  dueDate?: Date;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  employeeId: string;
  enrollmentDate: Date;
  status: EnrollmentStatus;
  progressPercentage: number;
  completionDate?: Date;
  isPassed?: boolean;
}

export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped';

export interface BenefitPlan {
  id: string;
  name: string;
  description?: string;
  planType: BenefitPlanType;
  isActive: boolean;
  coverageDetails?: Record<string, any>;
}

export type BenefitPlanType = 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'other';

export interface BenefitEnrollment {
  id: string;
  benefitPlanId: string;
  employeeId: string;
  enrollmentDate: Date;
  effectiveDate: Date;
  status: EnrollmentStatus;
  coverageLevels?: Record<string, any>;
}

export interface Dependent {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  relationship: Relationship;
  isCovered: boolean;
}

export type Relationship = 'spouse' | 'child' | 'parent' | 'other';

export interface SalaryBand {
  id: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  currency: string;
}

export interface CompensationHistory {
  id: string;
  employeeId: string;
  salaryBandId?: string;
  baseSalary: number;
  currency: string;
  effectiveDate: Date;
  changeReason?: string;
  changeType: CompensationChangeType;
}

export type CompensationChangeType = 'hire' | 'promotion' | 'merit' | 'adjustment' | 'demotion';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

// ============================================
// Request Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  restaurantName?: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  hireDate: Date;
  employmentType: EmploymentType;
  departmentId?: string;
  positionId?: string;
  locationId?: string;
  managerId?: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  reason?: string;
  attachment?: File;
}

export interface ClockInRequest {
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateOrderRequest {
  branchId: string;
  tableId?: string;
  items: OrderItemRequest[];
}

export interface OrderItemRequest {
  inventoryItemId: string;
  quantity: number;
  uomId?: string;
}

export interface CreateInventoryInflowRequest {
  branchId: string;
  supplierId?: string;
  items: InflowItemRequest[];
  receivedAt: Date;
  invoiceNumber?: string;
  notes?: string;
}

export interface InflowItemRequest {
  inventoryItemId: string;
  inputUomId: string;
  inputQuantity: number;
  inputCostPerUnit: number;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  lowStockItems: number;
  tableOccupancy: number;
  salesChange: number;
}

export interface HrmsDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  pendingTimesheets: number;
  upcomingBirthdays: number;
  upcomingAnniversaries: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
}

// ============================================
// Utility Types
// ============================================

export type ServiceType = 'rms' | 'hrms' | 'ims';

export interface ServiceContext {
  currentService: ServiceType;
  availableServices: ServiceType[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// ============================================
// Bulk Upload Types
// ============================================

export interface BulkUploadLog {
  id: string;
  businessId: string;
  uploadSessionId: string;
  lineNumber: number;
  rowData: Record<string, any>;
  errorMessages: string[];
  status: BulkUploadStatus;
  createdAt: Date;
}

export type BulkUploadStatus = 'failed' | 'skipped' | 'pending';

export interface BulkUploadResult {
  success: boolean;
  message: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  inflows?: InventoryInflow[];
  failedUploads?: BulkUploadLog[];
}
