# Codebase Cleanup Analysis

This document identifies components and code patterns that need cleanup and refactoring. The goal is to make the codebase more maintainable, readable, and easier to understand by breaking down large components into smaller, focused pieces.

## 🎯 Cleanup Strategy

**Goal**: Identify cleanup opportunities without implementing them, so the team can understand what needs to be refactored and do it manually to maintain code understanding.

---

## 📊 Critical Issues - Large Components

### 1. **`page.tsx` (Job Progress Page)** - 952 lines
**Location**: `src/app/dashboard/jobs/[id]/page.tsx`

**Issues**:
- **Too many responsibilities**: Handles drag & drop, filtering, candidate management, lane management, dialogs, SSE updates, and more
- **Excessive state management**: 20+ useState hooks managing different concerns
- **Complex useEffect chains**: Multiple useEffects with complex dependencies
- **Large filter logic**: 100+ lines of inline filter logic (lines 323-475)
- **Too many dialog states**: 10+ dialog state variables

**Recommended Breakdown**:
```
page.tsx (main orchestrator - ~200 lines)
├── hooks/
│   ├── useJobPageState.ts (consolidate all state)
│   ├── useCandidateFiltering.ts (extract filter logic)
│   ├── useDialogManagement.ts (manage all dialog states)
│   └── useColumnManagement.ts (column state and updates)
├── components/
│   ├── JobPageHeader.tsx (breadcrumb, actions, settings)
│   ├── JobPageFilters.tsx (QuickSelectAndFilter wrapper)
│   ├── JobPageKanban.tsx (DragDropContext + columns)
│   └── JobPageDialogs.tsx (all dialog components)
```

**Specific Extractable Logic**:
- Lines 323-475: Filter logic → `useCandidateFiltering` hook
- Lines 291-320: URL parameter handling → `useCandidateUrlParams` hook
- Lines 122-132: Checklist config handler → move to hook
- Lines 507-585: Loading skeleton → separate component

---

### 2. **`candidate-card.tsx`** - 1,589 lines
**Location**: `src/app/dashboard/jobs/[id]/components/Candidate/candidate-card.tsx`

**Issues**:
- **Massive component**: One of the largest components in the codebase
- **Too many responsibilities**: Rendering, state management, dialog management, event handling
- **Complex nested JSX**: Deeply nested conditional rendering
- **Multiple dialog states**: 8+ dialog state variables
- **Large renderCardContent**: 400+ lines of JSX in useMemo (lines 402-1349)
- **Repeated follow-up parsing logic**: Duplicated in candidate-details-dialog.tsx

**Recommended Breakdown**:
```
candidate-card.tsx (main card wrapper - ~150 lines)
├── hooks/
│   ├── useCandidateCardState.ts (all dialog states)
│   ├── useFollowUpParsing.ts (extract follow-up logic)
│   └── useCandidateCardActions.ts (handlers)
├── components/
│   ├── CandidateCardHeader.tsx (name, tags, buttons)
│   ├── CandidateCardFollowUp.tsx (follow-up section)
│   ├── CandidateCardInfo.tsx (experience, location, CTC, etc.)
│   ├── CandidateCardSkills.tsx (skills display)
│   ├── CandidateCardCustomFields.tsx (custom fields)
│   ├── CandidateCardScores.tsx (evaluation scores)
│   ├── CandidateCardAssignment.tsx (interview assignment footer)
│   ├── CandidateCardMenu.tsx (dropdown menu)
│   └── CandidateCardDialogs.tsx (all dialogs)
```

**Specific Extractable Sections**:
- Lines 402-676: Header section → `CandidateCardHeader`
- Lines 730-844: Follow-up section → `CandidateCardFollowUp`
- Lines 846-961: Info grid → `CandidateCardInfo`
- Lines 963-992: Skills → `CandidateCardSkills`
- Lines 994-1068: Custom fields → `CandidateCardCustomFields`
- Lines 1074-1085: Scores → `CandidateCardScores`
- Lines 1105-1320: Assignment footer → `CandidateCardAssignment`
- Lines 336-369: Follow-up parsing → `useFollowUpParsing` hook

---

### 3. **`candidate-details-dialog.tsx`** - 1,433 lines
**Location**: `src/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog.tsx`

**Issues**:
- **Very large dialog component**: Handles multiple tabs, history, logs, remarks
- **Complex tab management**: Multiple tabs with different data fetching
- **Repeated follow-up parsing**: Same logic as candidate-card.tsx (lines 548-621)
- **Large score rendering**: 200+ lines of score card rendering (lines 712-1006)
- **Mixed concerns**: UI rendering, data fetching, state management

**Recommended Breakdown**:
```
candidate-details-dialog.tsx (main dialog - ~200 lines)
├── hooks/
│   ├── useCandidateDetailsState.ts (all state)
│   ├── useCandidateHistory.ts (history fetching)
│   └── useFollowUpParsing.ts (shared with candidate-card)
├── components/
│   ├── CandidateDetailsHeader.tsx (already exists, use it)
│   ├── CandidateDetailsTabs.tsx (tab navigation)
│   ├── CandidateDetailsOverview.tsx (overview tab content)
│   ├── CandidateDetailsQuestions.tsx (questions tab)
│   ├── CandidateDetailsHistory.tsx (history tab)
│   ├── CandidateDetailsLogs.tsx (logs tab)
│   ├── CandidateDetailsScores.tsx (score cards - lines 712-1006)
│   ├── CandidateDetailsFollowUp.tsx (follow-up section)
│   └── CandidateDetailsFooter.tsx (action buttons, remark input)
```

**Specific Extractable Sections**:
- Lines 520-663: Follow-up section → `CandidateDetailsFollowUp`
- Lines 712-1006: Score cards → `CandidateDetailsScores`
- Lines 1024-1108: Questions tab → `CandidateDetailsQuestions`
- Lines 1110-1168: History tab → `CandidateDetailsHistory`
- Lines 1170-1195: Logs tab → `CandidateDetailsLogs`
- Lines 1200-1292: Footer → `CandidateDetailsFooter`

---

### 4. **`KanbanColumn.tsx`** - 477 lines
**Location**: `src/app/dashboard/jobs/[id]/components/Lanes/KanbanColumn.tsx`

**Issues**:
- **Complex sorting logic**: 70+ lines of sorting function (lines 113-182)
- **Too many props**: 20+ props passed down
- **Mixed concerns**: Sorting, filtering, virtualization, drag & drop

**Recommended Breakdown**:
```
KanbanColumn.tsx (main column - ~200 lines)
├── hooks/
│   ├── useCandidateSorting.ts (sort logic - lines 113-182)
│   └── useColumnCandidates.ts (filtering + sorting)
├── components/
│   ├── KanbanColumnHeader.tsx (title, count, menu)
│   ├── KanbanColumnChecklistIndicators.tsx (checklist icons)
│   └── KanbanColumnList.tsx (virtualized list)
```

**Specific Extractable Sections**:
- Lines 113-182: Sort function → `useCandidateSorting` hook
- Lines 252-360: Header section → `KanbanColumnHeader`
- Lines 272-339: Checklist indicators → `KanbanColumnChecklistIndicators`

---

### 5. **`useCandidate.ts` hook** - 449 lines
**Location**: `src/app/dashboard/jobs/[id]/hooks/useCandidate.ts`

**Issues**:
- **Too many responsibilities**: Drag & drop, updates, deletes, checklist validation
- **Complex onDragEnd**: 180+ lines (lines 196-380)
- **Pending moves logic**: Could be separate hook

**Recommended Breakdown**:
```
useCandidate.ts (main hook - ~100 lines)
├── hooks/
│   ├── useDragAndDrop.ts (onDragEnd logic)
│   ├── usePendingMoves.ts (pending moves management)
│   └── useCandidateMutations.ts (update, delete operations)
```

**Specific Extractable Sections**:
- Lines 196-380: `onDragEnd` → `useDragAndDrop` hook
- Lines 72-176: Pending moves → `usePendingMoves` hook

---

## 🔄 Repeated Code Patterns

### 1. **Follow-up Parsing Logic**
**Locations**:
- `candidate-card.tsx` lines 336-369
- `candidate-details-dialog.tsx` lines 548-621

**Issue**: Exact same logic duplicated in two places

**Solution**: Extract to `hooks/useFollowUpParsing.ts`

```typescript
// hooks/useFollowUpParsing.ts
export const useFollowUpParsing = (followUpNote: string | undefined) => {
  // Extract the parsing logic here
  // Return parsed parts, completion notes, regular notes, etc.
}
```

---

### 2. **Filter Logic**
**Location**: `page.tsx` lines 323-475

**Issue**: Large inline filter function with multiple conditions

**Solution**: Extract to `hooks/useCandidateFiltering.ts`

```typescript
// hooks/useCandidateFiltering.ts
export const useCandidateFiltering = (
  candidates: Candidate[],
  filterConditions: FilterState | null,
  showArchived: boolean
) => {
  // Extract all filter logic
  // Return filtered candidates
}
```

---

### 3. **Score Card Rendering**
**Location**: `candidate-details-dialog.tsx` lines 712-1006

**Issue**: Repeated pattern for each score type (overall, experience, skills, affordability)

**Solution**: Create reusable `ScoreCard` component

```typescript
// components/Utils/ScoreCard.tsx
<ScoreCard
  score={localCandidate.scores.overall}
  label="Overall Fit"
  description="Combined assessment"
  icon={<CheckCircle />}
/>
```

---

### 4. **Dialog State Management**
**Locations**: Multiple components

**Issue**: Similar pattern of dialog state management across components

**Solution**: Create `useDialogState` hook

```typescript
// hooks/useDialogState.ts
export const useDialogState = (initialDialogs: string[] = []) => {
  // Generic dialog state management
  // Returns isOpen, open, close functions for each dialog
}
```

---

## 🎣 Missing Hooks - Logic That Should Be Extracted

### 1. **URL Parameter Handling**
**Location**: `page.tsx` lines 298-320

**Extract to**: `hooks/useCandidateUrlParams.ts`
- Handle candidateId URL parameter
- Auto-open candidate dialog
- Clean up URL on close

---

### 2. **Column/Lane Management**
**Location**: `page.tsx` lines 429-475

**Extract to**: `hooks/useColumnManagement.ts`
- Handle lane data structures
- Update columns based on candidates
- Merge SSE updates

---

### 3. **Dialog Management**
**Location**: `page.tsx` (multiple useState for dialogs)

**Extract to**: `hooks/useDialogManagement.ts`
- Consolidate all dialog states
- Provide open/close functions
- Handle dialog dependencies

---

### 4. **Candidate Card Actions**
**Location**: `candidate-card.tsx` (multiple handlers)

**Extract to**: `hooks/useCandidateCardActions.ts`
- All click handlers
- Dialog open/close logic
- Action callbacks

---

### 5. **History Fetching**
**Location**: `candidate-details-dialog.tsx` lines 112-157

**Extract to**: `hooks/useCandidateHistory.ts`
- Fetch candidate history
- Handle loading states
- Manage history state

---

## 🏗️ Component Organization Issues

### 1. **Dialog Components Scattered**
**Location**: `components/Dialogs/` directory

**Issue**: Many dialogs are conditionally rendered in parent components instead of being self-contained

**Recommendation**: 
- Each dialog should manage its own open/close state when possible
- Use compound components pattern for related dialogs
- Create dialog groups (e.g., `CandidateDialogs`, `LaneDialogs`)

---

### 2. **Utility Components Mixed with Feature Components**
**Location**: `components/Utils/` and `components/Candidate/`

**Issue**: Some utility components are feature-specific

**Recommendation**:
- Move candidate-specific utils to `components/Candidate/utils/`
- Keep truly generic utils in `components/Utils/`

---

### 3. **Hooks Directory Structure**
**Location**: `hooks/` directory

**Issue**: All hooks in one directory, some are very specific

**Recommendation**:
```
hooks/
├── candidate/
│   ├── useCandidate.ts
│   ├── useCandidateCardActions.ts
│   ├── useCandidateFiltering.ts
│   └── useCandidateHistory.ts
├── kanban/
│   ├── useKanbanBoard.ts
│   ├── useDragAndDrop.ts
│   └── useColumnManagement.ts
└── shared/
    ├── useDialogState.ts
    └── useFollowUpParsing.ts
```

---

## 📝 Code Quality Issues

### 1. **Commented Out Code**
**Locations**: Multiple files

**Examples**:
- `page.tsx` lines 259-289, 490-499
- `candidate-card.tsx` lines 319-328, 371-382

**Recommendation**: Remove all commented code or convert to TODOs if needed

---

### 2. **Console.log Statements**
**Locations**: Multiple files

**Examples**:
- `candidate-card.tsx` lines 331, 342, 438
- `candidate-details-dialog.tsx` lines 315, 326, 337

**Recommendation**: Remove or replace with proper logging utility

---

### 3. **Large useMemo Dependencies**
**Location**: `page.tsx` lines 749-770

**Issue**: 20+ dependencies in useMemo

**Recommendation**: Break down into smaller memoized values

---

### 4. **Complex Conditional Rendering**
**Locations**: Multiple components

**Issue**: Deeply nested ternaries and conditionals

**Recommendation**: Extract to separate components or early returns

---

## 🎯 Priority Refactoring Order

### **High Priority** (Affects maintainability significantly)
1. ✅ Extract filter logic from `page.tsx` → `useCandidateFiltering`
2. ✅ Break down `candidate-card.tsx` into smaller components
3. ✅ Extract follow-up parsing to shared hook
4. ✅ Simplify `onDragEnd` in `useCandidate.ts`

### **Medium Priority** (Improves readability)
5. ✅ Extract dialog management to hook
6. ✅ Break down `candidate-details-dialog.tsx` tabs
7. ✅ Extract sorting logic from `KanbanColumn.tsx`
8. ✅ Create reusable `ScoreCard` component

### **Low Priority** (Nice to have)
9. ✅ Organize hooks directory structure
10. ✅ Remove commented code
11. ✅ Clean up console.logs
12. ✅ Reorganize component directories

---

## 📋 Summary Statistics

- **Total Components Analyzed**: 50+
- **Large Components (>500 lines)**: 3
- **Very Large Components (>1000 lines)**: 2
- **Repeated Code Patterns**: 4 major patterns
- **Missing Hooks**: 5+ opportunities
- **Commented Code Blocks**: 10+ instances

---

## 🚀 Next Steps

1. **Review this document** with the team
2. **Prioritize** which refactorings to tackle first
3. **Create tickets** for each refactoring task
4. **Start with high-priority items** that will have the most impact
5. **Refactor incrementally** - one component/hook at a time
6. **Test thoroughly** after each refactoring
7. **Update this document** as refactorings are completed

---

## 📚 Additional Notes

- All refactorings should maintain existing functionality
- Consider creating a refactoring branch for each major change
- Use TypeScript strictly - fix any `any` types during refactoring
- Add JSDoc comments to new hooks and components
- Consider adding unit tests for extracted hooks

---

*Last Updated: [Current Date]*
*Analysis Based On: Codebase snapshot from feature-ui-notification-sse branch*

