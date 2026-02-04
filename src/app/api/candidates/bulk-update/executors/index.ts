import type { BulkUpdateParams, BulkUpdateResult } from '../types';
import type { BulkUpdateContext } from '../types';
import { runBulkAssign } from './assign';
import { runBulkUnassign } from './unassign';
import { runBulkArchive } from './archive';
import { runBulkMoveJob } from './moveJob';
import { runBulkAddRemark } from './addRemark';
import { runBulkAddFollowUp } from './addFollowUp';
import { runBulkStatusUpdate } from './statusUpdate';

/**
 * Runs the appropriate bulk executor for the given operation.
 * All executors handle history updates; the route handles broadcast and notifications.
 */
export async function runBulkUpdate(
  params: BulkUpdateParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  switch (params.operation) {
    case 'assign':
      return runBulkAssign(params, ctx);
    case 'unassign':
      return runBulkUnassign(params, ctx);
    case 'archive':
      return runBulkArchive(params, ctx);
    case 'moveJob':
      return runBulkMoveJob(params, ctx);
    case 'addRemark':
      return runBulkAddRemark(params, ctx);
    case 'addFollowUp':
      return runBulkAddFollowUp(params, ctx);
    case 'statusUpdate':
      return runBulkStatusUpdate(params, ctx);
    default: {
      const _: never = params;
      return {
        success: false,
        updatedCount: 0,
        failedCount: 0,
        candidatesToBroadcast: [],
        message: 'Unknown operation',
      };
    }
  }
}
