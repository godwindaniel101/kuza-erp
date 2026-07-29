import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, In } from "typeorm";
import { Branch } from "../../../common/entities/branch.entity";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { Order } from "../../rms/entities/order.entity";
import { BranchInventoryItem } from "../../ims/entities/branch-inventory-item.entity";
import { BulkUploadLog } from "../../ims/entities/bulk-upload-log.entity";
import { BranchUser } from "../../../common/entities/branch-user.entity";
import { User } from "../../../common/entities/user.entity";
import {
  BranchScopeService,
  ScopeActor,
} from "../../../common/branch-scope/branch-scope.service";

// Interface for bulk upload results
export interface BulkBranchUploadResult {
  success: number;
  errors: string[];
  skipped: number;
  failedUploads: FailedBranchUpload[];
}

// Interface for failed uploads
export interface FailedBranchUpload {
  lineNumber: number;
  rowData: Record<string, string>;
  errors: string[];
  status: 'failed' | 'skipped' | 'duplicate';
}

// Interface for parsed branch row
export interface ParsedBranchRow {
  branchName: string;
  address?: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(BranchInventoryItem)
    private branchInventoryRepository: Repository<BranchInventoryItem>,
    @InjectRepository(BulkUploadLog)
    private bulkUploadLogRepository: Repository<BulkUploadLog>,
    @InjectRepository(BranchUser)
    private branchUserRepository: Repository<BranchUser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private branchScopeService: BranchScopeService,
  ) {}

  // ----------------------------------------------------------------------
  // Branch members (users assigned to a branch; isManager = branch manager)
  // ----------------------------------------------------------------------

  /** Tenant users that can be assigned to a branch (id, name, email). */
  async getAssignableUsers() {
    const users = await this.userRepository.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  /** Users assigned to a branch, with their user details + manager flag. */
  async listMembers(branchId: string) {
    await this.findOne(branchId); // 404 if branch missing
    const rows = await this.branchUserRepository.find({ where: { branchId } });
    if (rows.length === 0) return [];
    const users = await this.userRepository.find({
      where: { id: In(rows.map((r) => r.userId)) },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const u = byId.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        isManager: r.isManager,
        name: u?.name || null,
        email: u?.email || null,
      };
    });
  }

  /** Assign a user to a branch (idempotent; updates manager flag if re-added). */
  async addMember(branchId: string, userId: string, isManager = false) {
    await this.findOne(branchId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    let row = await this.branchUserRepository.findOne({ where: { branchId, userId } });
    if (row) {
      row.isManager = isManager;
    } else {
      row = this.branchUserRepository.create({ branchId, userId, isManager });
    }
    await this.branchUserRepository.save(row);
    return this.listMembers(branchId);
  }

  /** Toggle a member's manager flag. */
  async setMemberManager(branchId: string, userId: string, isManager: boolean) {
    const row = await this.branchUserRepository.findOne({ where: { branchId, userId } });
    if (!row) throw new NotFoundException("This user is not assigned to the branch");
    row.isManager = isManager;
    await this.branchUserRepository.save(row);
    return this.listMembers(branchId);
  }

  /** Remove a user's assignment from a branch. */
  async removeMember(branchId: string, userId: string) {
    const row = await this.branchUserRepository.findOne({ where: { branchId, userId } });
    if (row) await this.branchUserRepository.remove(row);
    return this.listMembers(branchId);
  }

  async create(createDto: CreateBranchDto) {
    // Check if branch with same name exists in this business
    const existing = await this.branchRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException("Branch with this name already exists");
    }

    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      await this.branchRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    const branch = this.branchRepository.create({
      name: createDto.name,
      address: createDto.address,
      phone: createDto.phone,
      email: createDto.email,
      isDefault: createDto.isDefault || false,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return await this.branchRepository.save(branch);
  }

  async findAll(includeStats = false, actor?: ScopeActor) {
    let branches = await this.branchRepository.find({
      order: { isDefault: "DESC", name: "ASC" },
    });

    // Branch-scoped users only ever see the branches they're assigned to.
    const allowed = await this.branchScopeService.allowedBranchIds(actor);
    if (allowed !== null) {
      const set = new Set(allowed);
      branches = branches.filter((b) => set.has(b.id));
    }

    if (!includeStats) {
      return branches;
    }

    // Get stats for each branch
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        // Get total sales for this branch
        const salesResult = await this.orderRepository
          .createQueryBuilder("order")
          .where("order.branchId = :branchId", { branchId: branch.id })
          .select("COALESCE(SUM(order.totalAmount), 0)", "totalSales")
          .getRawOne();

        const totalSales = parseFloat(salesResult?.totalSales || "0");

        // Get low stock count for this branch (only items with minimumStock > 0 that are tracked)
        const lowStockItems = await this.branchInventoryRepository
          .createQueryBuilder("bi")
          .innerJoin("bi.inventoryItem", "item")
          .where("bi.branchId = :branchId", { branchId: branch.id })
          .andWhere("item.isTrackable = :isTrackable", { isTrackable: true })
          .andWhere("bi.minimumStock > 0")
          .andWhere(
            "CAST(bi.currentStock AS DECIMAL) <= CAST(bi.minimumStock AS DECIMAL)",
          )
          .getCount();

        return {
          ...branch,
          stats: {
            lowStockCount: lowStockItems,
            totalSales,
          },
        };
      }),
    );

    return branchesWithStats;
  }

  async findOne(id: string) {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return branch;
  }

  async update(id: string, updateDto: UpdateBranchDto) {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    // If setting as default, unset other defaults
    if (updateDto.isDefault === true) {
      await this.branchRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(branch, {
      name: updateDto.name ?? branch.name,
      address: updateDto.address ?? branch.address,
      phone: updateDto.phone ?? branch.phone,
      email: updateDto.email ?? branch.email,
      isDefault: updateDto.isDefault ?? branch.isDefault,
      isActive: updateDto.isActive ?? branch.isActive,
    });

    return await this.branchRepository.save(branch);
  }

  async remove(id: string) {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    await this.branchRepository.remove(branch);
  }

  /**
   * Generate CSV template for bulk branch upload
   */
  async generateTemplate(): Promise<string> {
    const headers = ["Branch Name", "Address", "Contact Email", "Phone Number"];
    const sampleData = [
      ["Northpoint Outlet", "321 North Road, Houston, TX 77001", "northpoint@retailstore.com", "555-0123"],
      ["Downtown Branch", "123 Main Street, New York, NY 10001", "downtown@company.com", "555-0456"],
      ["Westside Location", "456 West Avenue, Los Angeles, CA 90001", "westside@business.com", "555-0789"],
    ];

    // Create CSV content
    const csvLines = [
      headers.join(","),
      ...sampleData.map(row => 
        row.map(cell => {
          // Escape commas and quotes in cell data
          if (cell.includes(",") || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(",")
      )
    ];

    return csvLines.join("\n");
  }

  /**
   * Bulk upload branches from CSV data
   * CSV format: Branch Name, Address, Contact Email, Phone Number
   * Only Branch Name is required
   */
  async bulkUpload(csv: string): Promise<BulkBranchUploadResult> {
    const errors: string[] = [];
    const failedUploads: FailedBranchUpload[] = [];
    let skipped = 0;

    // Generate upload session ID
    const uploadSessionId = `branch-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Remove BOM if present
    let csvContent = csv;
    if (csvContent.charCodeAt(0) === 0xfeff) {
      csvContent = csvContent.slice(1);
    }

    const lines = csvContent.trim().split("\n");

    if (lines.length < 2) {
      return {
        success: 0,
        errors: ["CSV file must have at least a header row and one data row"],
        skipped: 0,
        failedUploads: [],
      };
    }

    // Proper CSV parser that handles quoted fields with commas
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Parse header
    const header = lines[0];
    const headers = parseCSVLine(header)
      .map((h) => (h || "").trim().toLowerCase());

    // Normalize function
    const normalize = (value: string) =>
      value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const normalizedHeaders = headers.map(normalize);

    // Required headers - only Branch Name is required
    const requiredHeaders = ["branch name"].map(normalize);

    // Find missing headers
    const missingHeaders = requiredHeaders.filter(
      (req) => !normalizedHeaders.includes(req),
    );

    if (missingHeaders.length > 0) {
      return {
        success: 0,
        errors: [`Missing required headers: ${missingHeaders.join(", ")}`],
        skipped: 0,
        failedUploads: [],
      };
    }

    // Parse data lines
    const parsedRows: ParsedBranchRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const values = parseCSVLine(line).map((v) => (v || "").trim());

      // Skip empty lines
      if (values.every((v) => !v)) {
        skipped++;
        continue;
      }

      // Create row data object
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || "";
      });

      const rowErrors: string[] = [];

      try {
        // Extract fields
        const branchName = rowData["branch name"] || rowData["branchname"];
        const address = rowData["address"];
        const email = rowData["contact email"] || rowData["contactemail"] || rowData["email"];
        const phone = rowData["phone number"] || rowData["phonenumber"] || rowData["phone"];

        // Validate required fields
        if (!branchName) {
          rowErrors.push("Branch Name is required");
        }

        // Validate email format if provided
        if (email && email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email.trim())) {
            rowErrors.push("Invalid email format");
          }
        }

        // If validation fails, skip to next row
        if (rowErrors.length > 0) {
          failedUploads.push({
            lineNumber,
            rowData,
            errors: rowErrors,
            status: "failed",
          });
          continue;
        }

        // Create parsed row object
        const parsedRow: ParsedBranchRow = {
          branchName: branchName.trim(),
          address: address?.trim() || undefined,
          email: email?.trim() || undefined,
          phone: phone?.trim() || undefined,
        };

        parsedRows.push(parsedRow);
      } catch (error: any) {
        rowErrors.push(`Parsing error: ${error.message}`);
        failedUploads.push({
          lineNumber,
          rowData,
          errors: rowErrors,
          status: "failed",
        });
      }
    }

    if (parsedRows.length === 0) {
      return {
        success: 0,
        errors: errors.length > 0 ? errors : ["No valid rows found in CSV"],
        skipped,
        failedUploads,
      };
    }

    // Check for duplicates in the CSV and existing branches
    const existingBranches = await this.branchRepository.find({
      select: ['name', 'id'],
    });
    const existingBranchNames = new Set(
      existingBranches.map(b => b.name.toLowerCase())
    );

    // Process each branch
    let successCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const lineNumber = i + 2; // +2 because index starts at 0 and we skip header

      try {
        // Check for duplicate
        if (existingBranchNames.has(row.branchName.toLowerCase())) {
          failedUploads.push({
            lineNumber,
            rowData: { 
              "branch name": row.branchName,
              "address": row.address || "",
              "contact email": row.email || "",
              "phone number": row.phone || ""
            },
            errors: [`Branch with name "${row.branchName}" already exists`],
            status: "duplicate",
          });
          continue;
        }

        // Create branch
        const createDto: CreateBranchDto = {
          name: row.branchName,
          address: row.address,
          email: row.email,
          phone: row.phone,
          isDefault: false, // Default to false for bulk uploads
          isActive: true,   // Default to active
        };

        const createdBranch = await this.create(createDto);

        if (createdBranch) {
          // Add to existing names to prevent duplicates within the same CSV
          existingBranchNames.add(row.branchName.toLowerCase());
          successCount++;
        }
      } catch (error: any) {
        failedUploads.push({
          lineNumber,
          rowData: { 
            "branch name": row.branchName,
            "address": row.address || "",
            "contact email": row.email || "",
            "phone number": row.phone || ""
          },
          errors: [error.message || "Failed to create branch"],
          status: "failed",
        });
      }
    }

    // Log failed uploads to database
    if (failedUploads.length > 0) {
      try {
        const logEntries = failedUploads.map(failed => 
          this.bulkUploadLogRepository.create({
            uploadType: "branch",
            lineNumber: failed.lineNumber,
            rowData: failed.rowData,
            errorMessages: failed.errors,
            status: failed.status,
            uploadSessionId,
          })
        );
        
        await this.bulkUploadLogRepository.save(logEntries);
      } catch (logError: any) {
        // Non-critical: failed to persist upload error log; continue.
      }
    }

    return {
      success: successCount,
      errors,
      skipped,
      failedUploads,
    };
  }
}
