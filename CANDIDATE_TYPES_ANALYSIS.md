# Candidate Types Analysis & Fix Scope

## Executive Summary

After scouting the codebase, I've identified **multiple overlapping candidate type definitions** with inconsistencies across frontend and backend. This document outlines all candidate-related types and estimates the work required to consolidate them.

---

## Type Inventory

### 1. **Frontend Types** (Primary)

#### `Candidate` - Main Centralized Type
- **Location**: `src/types/candidate.ts`
- **Status**: ✅ Centralized (as you mentioned)
- **Usage**: 391 type usages across 124 files
- **Contains**: 
  - Embedded `Assignment` interface (not exported separately)
  - All candidate fields including `assignment: Assignment | null`

#### `Assignment` (Inside Candidate Type)
- **Location**: `src/types/candidate.ts` (lines 32-58)
- **Status**: ⚠️ Not exported separately, embedded in Candidate
- **Structure**: 
  ```typescript
  interface Assignment {
    interviewerId: string | { _id: string; name: string; email: string; duration: string };
    time: string;
    duration?: string;
    assignedAt: string;
    googleMeet?: {...};
    jobId?: Job;
  }
  ```

#### `Assignment` (Standalone)
- **Location**: `src/types/assignment.ts`
- **Status**: ⚠️ Separate file, slightly different structure
- **Differences**: 
  - Missing `duration` field
  - Has `status?: string` and `assignment?: { status: string }` (nested)
  - Different `interviewerId` type (no `duration` in object)

#### `CandidateAssignment` (Calendar Page)
- **Location**: `src/app/dashboard/calendar/page.tsx` (lines 40-85)
- **Status**: ⚠️ **Different type entirely** - this is a full candidate with assignment
- **Structure**: Contains full candidate fields + `assignment: Assignment | null`
- **Issue**: This is actually a `Candidate` type, not just an assignment

#### `CandidateAssignment` (Kanban Types)
- **Location**: `src/app/dashboard/jobs/[id]/types/candidate.types.ts` (lines 94-119)
- **Status**: ⚠️ Different from calendar version
- **Structure**: Just the assignment part, uses `NormalizedInterviewer`

#### `RawCandidate`
- **Location**: `src/app/dashboard/jobs/[id]/types/candidate.types.ts` (lines 187-220)
- **Status**: ✅ Purpose: API/SSE data before normalization
- **Usage**: Used in normalization pipeline

#### `NormalizedCandidate`
- **Location**: `src/app/dashboard/jobs/[id]/types/candidate.types.ts` (lines 226-252)
- **Status**: ✅ Purpose: After normalization
- **Usage**: Used in Kanban board
- **Note**: Extends `Candidate` but with normalized fields

### 2. **Backend Types**

#### `ICandidate` - MongoDB Model
- **Location**: `src/lib/models/candidate.ts` (lines 13-179)
- **Status**: ⚠️ Backend model interface
- **Differences from frontend**:
  - Uses `mongoose.Schema.Types.ObjectId` for references
  - `assignment` is optional (not `| null`)
  - `resume` is required (not nullable)
  - `customFields` is required (not optional)
  - `isDeleted` is required boolean (not optional)
  - Date types are `Date` objects (not strings)

#### `CandidateWithJob` (Evaluation API)
- **Location**: `src/app/api/candidates/evaluate/types.ts`
- **Status**: ⚠️ Specialized type for evaluation
- **Structure**: `Omit<ICandidate, 'jobId'> & { jobId: PopulatedJob }`

---

## Type Conflicts & Issues

### 🔴 Critical Issues

1. **Multiple `Assignment` Definitions**
   - `src/types/candidate.ts` (embedded, not exported)
   - `src/types/assignment.ts` (standalone, different structure)
   - `src/app/dashboard/jobs/[id]/types/candidate.types.ts` (`CandidateAssignment`)
   - **Impact**: Type mismatches, inconsistent field availability

2. **`CandidateAssignment` Name Confusion**
   - Calendar page: `CandidateAssignment` = Full candidate object
   - Kanban types: `CandidateAssignment` = Just assignment part
   - **Impact**: Developers confused about what type to use

3. **Frontend vs Backend Type Mismatch**
   - `Candidate` (frontend) vs `ICandidate` (backend)
   - Date handling: strings vs Date objects
   - Optional vs required fields differ
   - **Impact**: Type errors when passing data between layers

4. **Normalization Pipeline Types**
   - `RawCandidate` → `NormalizedCandidate` → `Candidate`
   - Multiple transformation layers
   - **Impact**: Type casting needed, potential runtime errors

### ⚠️ Medium Issues

5. **Inconsistent Optional Fields**
   - `resume`: `null` in frontend, required in backend
   - `assignment`: `| null` in frontend, optional in backend
   - `customFields`: optional in frontend, required in backend

6. **Date Type Inconsistencies**
   - Frontend: `string | Date`
   - Backend: `Date`
   - Normalized: `string`
   - **Impact**: Conversion needed at boundaries

7. **Job ID Type Variations**
   - `string` (ID only)
   - `JobObject` (populated)
   - `mongoose.Schema.Types.ObjectId` (backend)
   - **Impact**: Type guards needed everywhere

---

## Files Affected

### High Impact (Core Type Definitions)
- `src/types/candidate.ts` - Main Candidate type
- `src/types/assignment.ts` - Standalone Assignment
- `src/lib/models/candidate.ts` - Backend ICandidate
- `src/app/dashboard/jobs/[id]/types/candidate.types.ts` - Kanban types
- `src/app/dashboard/calendar/page.tsx` - Calendar CandidateAssignment

### Medium Impact (Type Usage)
- **124 files** using candidate types (391 usages total)
- Key areas:
  - API routes (`src/app/api/candidates/**`)
  - Dashboard components (`src/app/dashboard/jobs/[id]/**`)
  - Calendar components (`src/app/dashboard/calendar/**`)
  - Normalization utilities (`src/app/dashboard/jobs/[id]/utils/**`)

---

## Work Estimate

### Phase 1: Type Consolidation (High Priority)
**Estimated Time: 4-6 hours**

1. **Consolidate Assignment Types**
   - Merge `src/types/assignment.ts` into `src/types/candidate.ts`
   - Export `Assignment` as separate type
   - Update all imports (15-20 files)

2. **Fix CandidateAssignment Naming**
   - Rename calendar `CandidateAssignment` → `Candidate` (it's already a candidate)
   - Keep kanban `CandidateAssignment` for assignment-only
   - Update calendar page (1 file)

3. **Align Frontend/Backend Types**
   - Create type adapters/mappers
   - Document conversion patterns
   - Update API route types (10-15 files)

### Phase 2: Type Refinement (Medium Priority)
**Estimated Time: 3-4 hours**

4. **Standardize Optional Fields**
   - Review and align optional vs required
   - Update type definitions
   - Fix type errors (20-30 files)

5. **Date Type Consistency**
   - Create utility types for date handling
   - Update normalization functions
   - Fix date conversions (10-15 files)

6. **Job ID Type Guards**
   - Consolidate type guard utilities
   - Update all usages
   - Remove redundant checks (15-20 files)

### Phase 3: Cleanup & Documentation (Low Priority)
**Estimated Time: 2-3 hours**

7. **Remove Redundant Types**
   - Audit all candidate-related types
   - Remove unused definitions
   - Update imports

8. **Documentation**
   - Document type hierarchy
   - Create migration guide
   - Add JSDoc comments

---

## Recommended Approach

### Option A: Incremental (Safer)
1. Start with Phase 1 (consolidation)
2. Test thoroughly
3. Proceed to Phase 2
4. Cleanup in Phase 3

**Total Estimate: 9-13 hours**

### Option B: Comprehensive (Faster, Riskier)
1. Do all phases in one go
2. Requires extensive testing
3. Higher risk of breaking changes

**Total Estimate: 8-10 hours** (with risk)

---

## Risk Assessment

### Low Risk
- Consolidating Assignment types
- Renaming calendar CandidateAssignment
- Adding type exports

### Medium Risk
- Aligning frontend/backend types
- Changing optional fields
- Date type standardization

### High Risk
- Removing types in active use
- Changing core Candidate structure
- Breaking API contracts

---

## Key Takeaways

1. **Main Issue**: Multiple overlapping type definitions causing confusion
2. **Root Cause**: Types evolved organically without centralization
3. **Impact**: 124 files affected, 391 type usages
4. **Effort**: 9-13 hours for safe, incremental fix
5. **Priority**: Start with Assignment consolidation (biggest win)

---

## Next Steps

1. Review this analysis
2. Decide on approach (Incremental vs Comprehensive)
3. Prioritize which phases to tackle first
4. Create detailed migration plan for selected approach

