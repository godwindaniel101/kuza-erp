import { ForbiddenException } from '@nestjs/common';
import { BranchScopeService } from './branch-scope.service';
import { createMockRepo, MockRepo } from '../../../test/repo-mock';

/**
 * Branch access-control invariants:
 *  - admins are UNSCOPED (see all branches → null);
 *  - a non-admin is limited to their assignments; with NONE they see nothing (→ []);
 *  - a scoped user cannot resolve a branch outside their set (403);
 *  - a scoped user with no requested branch is filtered to their whole set.
 */
describe('BranchScopeService', () => {
  let service: BranchScopeService;
  let repo: MockRepo;

  beforeEach(() => {
    repo = createMockRepo();
    service = new BranchScopeService(repo as any);
  });

  const assign = (branchIds: string[]) =>
    repo.find.mockResolvedValue(branchIds.map((branchId) => ({ branchId })));

  describe('allowedBranchIds', () => {
    it('returns null (all) for an admin, without hitting the DB', async () => {
      const actor = { id: 'u1', roles: [{ name: 'admin' }] };
      expect(await service.allowedBranchIds(actor)).toBeNull();
      expect(repo.find).not.toHaveBeenCalled();
    });

    it('returns [] (nothing) for a non-admin with no branch assignments', async () => {
      assign([]);
      expect(await service.allowedBranchIds({ id: 'u1', roles: [] })).toEqual([]);
    });

    it('returns the assigned branch ids for a scoped user', async () => {
      assign(['b1', 'b2']);
      expect(await service.allowedBranchIds({ id: 'u1', roles: [{ name: 'staff' }] })).toEqual(['b1', 'b2']);
    });

    it('returns null when there is no actor id', async () => {
      expect(await service.allowedBranchIds({ roles: [] })).toBeNull();
    });
  });

  describe('resolveBranchFilter', () => {
    it('no assignments + requested branch → 403 (no access to any branch)', async () => {
      assign([]);
      await expect(
        service.resolveBranchFilter({ id: 'u1', roles: [] }, 'b9'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no assignments + no request → [] (empty filter → no results)', async () => {
      assign([]);
      expect(await service.resolveBranchFilter({ id: 'u1', roles: [] })).toEqual([]);
    });

    it('admin (unscoped) + no request → null (all branches)', async () => {
      const actor = { id: 'u1', roles: [{ name: 'admin' }] };
      expect(await service.resolveBranchFilter(actor)).toBeNull();
    });

    it('scoped + requested branch IN set → filters to that branch', async () => {
      assign(['b1', 'b2']);
      expect(await service.resolveBranchFilter({ id: 'u1', roles: [] }, 'b2')).toEqual(['b2']);
    });

    it('scoped + requested branch OUT of set → 403', async () => {
      assign(['b1', 'b2']);
      await expect(
        service.resolveBranchFilter({ id: 'u1', roles: [] }, 'b9'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('scoped + no request → filters to the full allowed set', async () => {
      assign(['b1', 'b2']);
      expect(await service.resolveBranchFilter({ id: 'u1', roles: [] })).toEqual(['b1', 'b2']);
    });

    it('admin bypasses scoping entirely', async () => {
      const actor = { id: 'u1', roles: ['admin'] };
      expect(await service.resolveBranchFilter(actor, 'b9')).toEqual(['b9']);
      expect(await service.resolveBranchFilter(actor)).toBeNull();
    });
  });
});
