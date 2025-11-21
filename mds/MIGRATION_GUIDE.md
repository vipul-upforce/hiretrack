# Checklist Feature Migration Guide

## Overview
This guide covers the database migration requirements for the new lane-specific checklist feature.

## Migration Summary
- ✅ **Safe Migration**: All changes are backwards compatible
- ✅ **No Data Loss**: Existing data remains intact
- ✅ **Optional Fields**: New fields won't break existing functionality
- ⚠️ **App Restart Required**: New models need to be loaded

## What Changed

### New Collections Created:
1. **`joblaneconfigs`** - Stores job-specific lane checklist configurations
2. **`checklisttemplates`** - Stores reusable checklist templates

### Modified Existing Collections:
1. **`candidates`** - Added optional `checklistData` field
2. **`histories`** - Added optional `checklistForm` field

## Migration Steps

### Step 1: Application Code Deployment
Deploy the new code with updated models:
- New models are already registered in `/src/lib/mongodb.ts`
- API routes are ready to handle checklist operations

### Step 2: Database Index Creation (Recommended)
Run the migration script to create optimal indexes:

```bash
# Option 1: Using MongoDB shell
mongosh your_database_name < migration-script.js

# Option 2: Using Node.js
node -e "
const { MongoClient } = require('mongodb');
// Include migration script content here
"
```

### Step 3: Application Restart
Restart your Next.js application to load the new models:

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## Verification Steps

### 1. Check Model Registration
After restart, check logs for:
```
Models registered
```

### 2. Test API Endpoints
- `GET /api/jobs/[id]/checklist-config` - Should return empty config
- `GET /api/checklist-templates` - Should return empty array
- Both should respond with 200 status

### 3. Database Collections
Check that new collections are created when first accessed:
```javascript
// In MongoDB shell
db.joblaneconfigs.find().count()  // Should return 0 initially
db.checklisttemplates.find().count()  // Should return 0 initially
```

## Rollback Plan (if needed)

If you need to rollback:

### 1. Revert Code
- Revert to previous version
- Remove new model imports from `mongodb.ts`

### 2. Database Cleanup (Optional)
```javascript
// Only if you want to remove new collections
db.joblaneconfigs.drop()
db.checklisttemplates.drop()

// Remove new fields from existing collections (optional)
db.candidates.updateMany({}, { $unset: { "checklistData": "" } })
db.histories.updateMany({}, { $unset: { "history.$[].checklistForm": "" } })
```

## Performance Considerations

### Recommended Indexes (Created by migration script):

**JobLaneConfig Collection:**
- `{ jobId: 1 }` (unique) - Fast job-specific config lookup
- `{ organizationId: 1 }` - Organization-based queries
- `{ updatedAt: -1 }` - Recent updates

**ChecklistTemplate Collection:**
- `{ organizationId: 1, type: 1 }` - Filter by org and type 
- `{ organizationId: 1, isActive: 1 }` - Active templates only
- `{ createdBy: 1 }` - User's templates
- `{ updatedAt: -1 }` - Recent templates

**Enhanced Existing Collections:**
- `{ checklistData: 1 }` on candidates (sparse)
- `{ "history.checklistForm.checklistId": 1 }` on histories (sparse)

## Testing Checklist

After migration, verify:

- [ ] Application starts without errors
- [ ] Existing functionality works (candidate movement, remarks)
- [ ] New API endpoints respond correctly
- [ ] Lane configuration UI loads
- [ ] Checklist templates can be created
- [ ] Candidate movement with checklists works
- [ ] History shows checklist form entries with icons

## Troubleshooting

### Common Issues:

**1. "Model not found" errors**
- Ensure application restart after code deployment
- Check `mongodb.ts` includes new model imports

**2. Mongoose validation errors**
- New fields are optional, shouldn't cause validation issues
- Check for typos in model definitions

**3. API 500 errors**
- Check logs for specific error messages
- Verify database connection
- Ensure proper authentication

### Getting Help:
- Check application logs for specific errors
- Verify MongoDB connection and permissions
- Test with simple API calls first

## Post-Migration Steps

1. **Create Default Templates**: Set up common checklist templates
2. **Configure Lanes**: Add checklists to frequently used lanes  
3. **User Training**: Train HR/Admin users on new functionality
4. **Monitor Performance**: Watch for any performance impacts
5. **Backup**: Take a backup after successful migration

## Notes
- This is a feature addition, not a data migration
- All existing workflows continue to work unchanged
- New functionality is additive and optional
- Zero downtime deployment possible (except for app restart)