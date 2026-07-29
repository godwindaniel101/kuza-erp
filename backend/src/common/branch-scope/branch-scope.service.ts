import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchUser } from '../entities/branch-user.entity';

/** The subset of request.user the scope resolver needs. */
export interface ScopeActor {
  id?: string; // tenant user id (matches branch_users.userId)
  roles?: Array<{ name?: string } | string> | null;
}

/**
 * Resolves which branches a user is allowed to see, and enforces that a
 * requested branch is within that set.
 *
 * Rules:
 *  - Admins (role 'admin') are UNSCOPED — they see every branch.
 *  - A non-admin user is limited to exactly the branches they're assigned to.
 *    With NO assignments they see NO branch data until assigned (an empty set).
 *
 * allowedBranchIds() returns:
 *  - `null`  → unscoped (all branches) — admins only;
 *  - `[]`    → scoped to nothing (assigned to no branch);
 *  - `[...]` → scoped to those branches.
 */
@Injectable()
export class BranchScopeService {
  constructor(
    @InjectRepository(BranchUser)
    private readonly branchUserRepository: Repository<BranchUser>,
  ) {}

  private isAdmin(actor: ScopeActor | undefined): boolean {
    return (actor?.roles || []).some((r) => (typeof r === 'string' ? r : r?.name) === 'admin');
  }

  /**
   * The branch ids this user may access, or `null` if unscoped (all branches).
   * Runs in the caller's tenant context (branch_users is tenant-scoped).
   */
  async allowedBranchIds(actor: ScopeActor | undefined): Promise<string[] | null> {
    if (this.isAdmin(actor)) return null; // admin → all branches
    if (!actor?.id) return null; // no identity to scope by → unchanged
    const rows = await this.branchUserRepository.find({ where: { userId: actor.id } });
    // A non-admin is limited to their assignments — an empty list means no
    // branch access at all (must be assigned first), NOT "all branches".
    return rows.map((r) => r.branchId);
  }

  /**
   * Resolve the effective branch filter for a list endpoint:
   *  - unscoped user: returns `requested` (a single id) or `null` (all) as asked.
   *  - scoped user + requested id: must be in the allowed set, else 403.
   *  - scoped user + no request: returns the full allowed set to filter by.
   * The result is a list of branch ids to filter by, or `null` for "no filter".
   */
  async resolveBranchFilter(
    actor: ScopeActor | undefined,
    requested?: string,
  ): Promise<string[] | null> {
    const allowed = await this.allowedBranchIds(actor);
    if (allowed === null) {
      return requested ? [requested] : null; // unscoped: honor request as-is
    }
    if (requested) {
      if (!allowed.includes(requested)) {
        throw new ForbiddenException('You do not have access to this branch.');
      }
      return [requested];
    }
    return allowed;
  }
}
