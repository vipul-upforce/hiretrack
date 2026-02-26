import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  History,
  Job,
  User,
  DuplicateCandidate,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import type {
  BulkUpdateOperation,
  BulkUpdateParams,
  BulkUpdateOperationParams,
  BulkUpdateRequest,
  BulkUpdateResult,
  BulkAssignParams,
} from './types';
import { runBulkUpdate } from './executors';

const VALID_OPERATIONS: BulkUpdateOperation[] = [
  'assign',
  'unassign',
  'archive',
  'moveJob',
  'addRemark',
  'addFollowUp',
  'removeFollowUp',
  'statusUpdate',
];

/** Process in chunks to reduce memory and DB pressure */
const CHUNK_SIZE = 75;

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

function parseOperation(
  op: Record<string, unknown>,
  candidateIds: string[],
): { error?: string; params?: BulkUpdateParams } {
  const operation = op.operation as string;
  if (!VALID_OPERATIONS.includes(operation as BulkUpdateOperation)) {
    return {
      error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`,
    };
  }

  const base = { candidateIds };

  switch (operation) {
    case 'assign': {
      const { interviewerId } = op;
      if (!interviewerId || typeof interviewerId !== 'string') {
        return { error: 'assign requires interviewerId (string)' };
      }
      return {
        params: {
          operation: 'assign',
          ...base,
          interviewerId,
          time: op.time as string | null,
          attachments:
            (op.attachments as BulkAssignParams['attachments']) ?? [],
          scheduleGoogleMeet: (op.scheduleGoogleMeet as boolean) ?? false,
          meetDuration: (op.meetDuration as number) ?? 30,
          meetingNotes: (op.meetingNotes as string) ?? '',
          meetingAttachments:
            (op.meetingAttachments as BulkAssignParams['meetingAttachments']) ??
            [],
          additionalGuests: (op.additionalGuests as string[]) ?? [],
          scheduleZoomMeet: (op.scheduleZoomMeet as boolean) ?? false,
          zoomMeetDuration: (op.zoomMeetDuration as number) ?? 30,
          zoomMeetingNotes: (op.zoomMeetingNotes as string) ?? '',
          zoomMeetingAttachments:
            (op.zoomMeetingAttachments as BulkAssignParams['zoomMeetingAttachments']) ??
            [],
          zoomAdditionalGuests: (op.zoomAdditionalGuests as string[]) ?? [],
          remark: (op.remark as string) ?? undefined,
        },
      };
    }
    case 'unassign':
      return {
        params: {
          operation: 'unassign',
          ...base,
          remark: (op.remark as string) ?? undefined,
        },
      };
    case 'archive': {
      const { action } = op;
      if (action !== 'archive' && action !== 'unarchive') {
        return { error: "archive requires action: 'archive' or 'unarchive'" };
      }
      return { params: { operation: 'archive', ...base, action } };
    }
    case 'moveJob': {
      const { jobId } = op;
      if (!jobId || typeof jobId !== 'string') {
        return { error: 'moveJob requires jobId (string)' };
      }
      return { params: { operation: 'moveJob', ...base, jobId } };
    }
    case 'addRemark': {
      const { description } = op;
      if (!description || typeof description !== 'string') {
        return { error: 'addRemark requires description (string)' };
      }
      return {
        params: {
          operation: 'addRemark',
          ...base,
          description,
          isPrivate: (op.isPrivate as boolean) ?? false,
          rating: (op.rating as number) ?? 0,
          selectedMentionUserIds:
            (op.selectedMentionUserIds as string[] | undefined) ?? [],
        },
      };
    }
    case 'addFollowUp': {
      const { note } = op;
      if (note !== undefined && typeof note !== 'string') {
        return { error: 'addFollowUp requires note (string)' };
      }
      return {
        params: {
          operation: 'addFollowUp',
          ...base,
          note: (note as string) ?? '',
          date: (op.date as string | null) ?? null,
        },
      };
    }
    case 'removeFollowUp':
      return { params: { operation: 'removeFollowUp', ...base } };
    case 'statusUpdate': {
      const { status } = op;
      if (status === undefined || typeof status !== 'string') {
        return { error: 'statusUpdate requires status (string)' };
      }
      return {
        params: {
          operation: 'statusUpdate',
          ...base,
          status,
          remark: (op.remark as string) ?? undefined,
        },
      };
    }
    default:
      return { error: 'Unknown operation' };
  }
}

function parseBody(body: unknown): {
  error?: string;
  request?: BulkUpdateRequest;
  singleParams?: BulkUpdateParams;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const b = body as Record<string, unknown>;

  // Check for candidateIds
  if (!('candidateIds' in b)) {
    return { error: 'Request body must include candidateIds' };
  }
  const candidateIds = b.candidateIds as unknown;
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { error: 'candidateIds must be a non-empty array' };
  }
  if (candidateIds.some((id) => typeof id !== 'string')) {
    return { error: 'All candidateIds must be strings' };
  }
  const candidateIdsArray = candidateIds as string[];

  // Support both single operation (backward compatibility) and operations array
  if ('operations' in b && Array.isArray(b.operations)) {
    // Multiple operations
    const operations: BulkUpdateOperationParams[] = [];
    for (const op of b.operations) {
      if (!op || typeof op !== 'object' || !('operation' in op)) {
        return { error: 'Each operation must have an operation field' };
      }
      const parsed = parseOperation(
        op as Record<string, unknown>,
        candidateIdsArray,
      );
      if (parsed.error) {
        return { error: parsed.error };
      }
      if (parsed.params) {
        // Remove candidateIds from params to match BulkUpdateOperationParams
        const { candidateIds: _, ...rest } = parsed.params;
        operations.push(rest as BulkUpdateOperationParams);
      }
    }
    if (operations.length === 0) {
      return { error: 'At least one operation is required' };
    }
    return { request: { candidateIds: candidateIdsArray, operations } };
  }
  if ('operation' in b) {
    // Single operation (backward compatibility)
    const parsed = parseOperation(b, candidateIdsArray);
    if (parsed.error) {
      return { error: parsed.error };
    }
    return { singleParams: parsed.params };
  }

  return {
    error: 'Request body must include either operation or operations array',
  };
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<BulkUpdateResult | { error: string }>> {
  try {
    await connectToDatabase();
    const [user, body] = await Promise.all([
      getAuthenticatedUser(req, ['admin', 'hr']),
      req.json().catch(() => null),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = parseBody(body);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!Candidate || !History || !Job || !User) {
      return NextResponse.json(
        { error: 'Models not available' },
        { status: 500 },
      );
    }

    const candidateIds =
      parsed.request?.candidateIds ?? parsed.singleParams?.candidateIds ?? [];

    // Log large batches for monitoring
    if (candidateIds.length > 1000) {
      logger.info(
        {
          candidateCount: candidateIds.length,
          userId: user.id,
          organizationId: user.organizationId,
          operation:
            parsed.request?.operations?.[0]?.operation ??
            parsed.singleParams?.operation,
        },
        'Large bulk update request received',
      );
    }

    const dateTime = new Date().toISOString();
    const ctx = {
      user: {
        id: user.id ?? '',
        name: user.name ?? '',
        email: user.email,
        organizationId: user.organizationId,
        organizationInfo: user.organizationInfo,
      },
      dateTime,
      Candidate,
      History,
      Job,
      User,
      DuplicateCandidate: DuplicateCandidate ?? null,
      requestHeaders: req.headers,
    };

    // Handle multiple operations or single operation
    const allCandidatesToBroadcast: BulkUpdateResult['candidatesToBroadcast'] =
      [];
    let totalUpdatedCount = 0;
    let totalFailedCount = 0;
    let totalSkippedCount = 0;
    const messages: string[] = [];
    let moveJobMeta: { jobTitle?: string; toJobId?: string } | undefined;
    let assignNotificationMeta: BulkUpdateResult['assignNotificationMeta'];
    let unassignNotificationMeta: BulkUpdateResult['unassignNotificationMeta'];
    let addRemarkNotificationMeta: BulkUpdateResult['addRemarkNotificationMeta'];
    let addFollowUpNotificationMeta: BulkUpdateResult['addFollowUpNotificationMeta'];
    let statusUpdateNotificationMeta: BulkUpdateResult['statusUpdateNotificationMeta'];

    const chunks = chunkIds(candidateIds, CHUNK_SIZE);

    if (parsed.request) {
      // Multiple operations: process sequentially, each operation in chunks
      for (const op of parsed.request.operations) {
        for (let ci = 0; ci < chunks.length; ci += 1) {
          const chunk = chunks[ci];
          const params: BulkUpdateParams = {
            ...op,
            candidateIds: chunk,
          } as BulkUpdateParams;
          const result = await runBulkUpdate(params, ctx);
          totalUpdatedCount += result.updatedCount;
          totalFailedCount += result.failedCount;
          if (result.skippedCount) totalSkippedCount += result.skippedCount;
          if (ci === 0) messages.push(result.message);
          allCandidatesToBroadcast.push(...result.candidatesToBroadcast);
          if (op.operation === 'moveJob' && result.meta) {
            moveJobMeta = result.meta;
          }
          if (result.assignNotificationMeta) {
            if (!assignNotificationMeta) {
              assignNotificationMeta = {
                ...result.assignNotificationMeta,
                candidates: [],
              };
            }
            assignNotificationMeta.candidates.push(
              ...result.assignNotificationMeta.candidates,
            );
          }
          if (result.unassignNotificationMeta) {
            if (!unassignNotificationMeta) {
              unassignNotificationMeta = {
                ...result.unassignNotificationMeta,
                unassignments: [],
              };
            }
            unassignNotificationMeta.unassignments.push(
              ...result.unassignNotificationMeta.unassignments,
            );
          }
          if (result.addRemarkNotificationMeta) {
            if (!addRemarkNotificationMeta) {
              addRemarkNotificationMeta = {
                ...result.addRemarkNotificationMeta,
                candidates: [],
              };
            }
            addRemarkNotificationMeta.candidates.push(
              ...result.addRemarkNotificationMeta.candidates,
            );
          }
          if (result.addFollowUpNotificationMeta) {
            if (!addFollowUpNotificationMeta) {
              addFollowUpNotificationMeta = {
                ...result.addFollowUpNotificationMeta,
                candidates: [],
              };
            }
            addFollowUpNotificationMeta.candidates.push(
              ...result.addFollowUpNotificationMeta.candidates,
            );
          }
          if (result.statusUpdateNotificationMeta) {
            if (!statusUpdateNotificationMeta) {
              statusUpdateNotificationMeta = {
                ...result.statusUpdateNotificationMeta,
                candidates: [],
              };
            }
            statusUpdateNotificationMeta.candidates.push(
              ...result.statusUpdateNotificationMeta.candidates,
            );
          }
          if (chunks.length > 1) {
            await new Promise<void>((r) => {
              setImmediate(r);
            });
          }
        }
      }
    } else if (parsed.singleParams) {
      // Single operation (backward compatibility): process in chunks
      for (let ci = 0; ci < chunks.length; ci += 1) {
        const chunk = chunks[ci];
        const params: BulkUpdateParams = {
          ...parsed.singleParams,
          candidateIds: chunk,
        } as BulkUpdateParams;
        const result = await runBulkUpdate(params, ctx);
        totalUpdatedCount += result.updatedCount;
        totalFailedCount += result.failedCount;
        if (result.skippedCount) totalSkippedCount += result.skippedCount;
        if (ci === 0) messages.push(result.message);
        allCandidatesToBroadcast.push(...result.candidatesToBroadcast);
        if (parsed.singleParams.operation === 'moveJob' && result.meta) {
          moveJobMeta = result.meta;
        }
        if (result.assignNotificationMeta) {
          if (!assignNotificationMeta) {
            assignNotificationMeta = {
              ...result.assignNotificationMeta,
              candidates: [],
            };
          }
          assignNotificationMeta.candidates.push(
            ...result.assignNotificationMeta.candidates,
          );
        }
        if (result.unassignNotificationMeta) {
          if (!unassignNotificationMeta) {
            unassignNotificationMeta = {
              ...result.unassignNotificationMeta,
              unassignments: [],
            };
          }
          unassignNotificationMeta.unassignments.push(
            ...result.unassignNotificationMeta.unassignments,
          );
        }
        if (result.addRemarkNotificationMeta) {
          if (!addRemarkNotificationMeta) {
            addRemarkNotificationMeta = {
              ...result.addRemarkNotificationMeta,
              candidates: [],
            };
          }
          addRemarkNotificationMeta.candidates.push(
            ...result.addRemarkNotificationMeta.candidates,
          );
        }
        if (result.addFollowUpNotificationMeta) {
          if (!addFollowUpNotificationMeta) {
            addFollowUpNotificationMeta = {
              ...result.addFollowUpNotificationMeta,
              candidates: [],
            };
          }
          addFollowUpNotificationMeta.candidates.push(
            ...result.addFollowUpNotificationMeta.candidates,
          );
        }
        if (result.statusUpdateNotificationMeta) {
          if (!statusUpdateNotificationMeta) {
            statusUpdateNotificationMeta = {
              ...result.statusUpdateNotificationMeta,
              candidates: [],
            };
          }
          statusUpdateNotificationMeta.candidates.push(
            ...result.statusUpdateNotificationMeta.candidates,
          );
        }
        if (chunks.length > 1) {
          await new Promise<void>((r) => {
            setImmediate(r);
          });
        }
      }
    }

    // Deduplicate candidates by _id (in case multiple operations updated the same candidate)
    const candidateMap = new Map<
      string,
      BulkUpdateResult['candidatesToBroadcast'][0]
    >();
    for (const candidate of allCandidatesToBroadcast) {
      const id = (candidate as { _id?: unknown })._id?.toString();
      if (id) {
        candidateMap.set(id, candidate);
      }
    }
    const uniqueCandidatesToBroadcast = Array.from(candidateMap.values());

    if (uniqueCandidatesToBroadcast.length > 0) {
      broadcastMultipleCandidateUpdate(uniqueCandidatesToBroadcast).catch(
        (error) => {
          logger.error(
            { error, url: req.url },
            'Bulk update: failed to broadcast',
          );
        },
      );
    }

    // Send notification for moveJob if applicable
    if (
      moveJobMeta?.toJobId &&
      moveJobMeta?.jobTitle &&
      user.organizationId &&
      totalUpdatedCount > 0
    ) {
      const movedIds = uniqueCandidatesToBroadcast
        .map((c) => (c as { _id?: unknown })._id?.toString())
        .filter((id): id is string => Boolean(id));
      try {
        await NotificationService.notifyBulkCandidateMoved({
          organizationId: user.organizationId,
          candidateIds: movedIds.length > 0 ? movedIds : candidateIds,
          toJobId: moveJobMeta.toJobId,
          toJobTitle: moveJobMeta.jobTitle,
          triggerUserId: user.id ?? '',
          triggerUserName: user.name ?? '',
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Bulk update: failed to send move notification',
        );
      }
    }
    // Bulk assign: interviewer gets one per candidate; admin/hr get one bulk
    if (assignNotificationMeta && user.organizationId) {
      try {
        await NotificationService.notifyBulkCandidateAssigned({
          organizationId: user.organizationId,
          interviewerId: assignNotificationMeta.interviewerId,
          interviewerName: assignNotificationMeta.interviewerName,
          jobId: assignNotificationMeta.jobId,
          jobTitle: assignNotificationMeta.jobTitle,
          candidates: assignNotificationMeta.candidates,
          triggerUserId: user.id ?? '',
          triggerUserName: user.name ?? '',
          triggerUserEmail: user.email,
          scheduledTime: assignNotificationMeta.scheduledTime,
          duration: assignNotificationMeta.duration,
          meetingLink: assignNotificationMeta.meetingLink,
          outlookCalendarLink: assignNotificationMeta.outlookCalendarLink,
          interviewType: assignNotificationMeta.interviewType,
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Bulk update: failed to send bulk assign notification',
        );
      }
    }

    // Bulk unassign: each previous interviewer gets one per candidate; admin/hr get one bulk
    if (unassignNotificationMeta && user.organizationId) {
      try {
        await NotificationService.notifyBulkCandidateUnassigned({
          organizationId: user.organizationId,
          unassignments: unassignNotificationMeta.unassignments,
          triggerUserId: user.id ?? '',
          triggerUserName: user.name ?? '',
          triggerUserEmail: user.email,
          feedback: unassignNotificationMeta.feedback,
          nextStep: unassignNotificationMeta.nextStep,
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Bulk update: failed to send bulk unassign notification',
        );
      }
    }

    // Bulk add remark: mentioned users get one per candidate (as MENTIONS); admin/hr get one bulk (as NEW_REMARKS)
    if (addRemarkNotificationMeta && user.organizationId) {
      try {
        await NotificationService.notifyBulkRemarkAdded({
          organizationId: user.organizationId,
          remarkText: addRemarkNotificationMeta.remarkText,
          roles: addRemarkNotificationMeta.roles,
          validMentionUserIds: addRemarkNotificationMeta.validMentionUserIds,
          rating: addRemarkNotificationMeta.rating,
          candidates: addRemarkNotificationMeta.candidates,
          triggerUserId: user.id ?? '',
          triggerUserName: user.name ?? '',
          triggerUserEmail: user.email,
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Bulk update: failed to send bulk remark notification',
        );
      }
    }

    // Bulk add follow-up: admin/hr get one bulk
    if (addFollowUpNotificationMeta && user.organizationId) {
      try {
        await NotificationService.notifyBulkFollowUpAdded({
          organizationId: user.organizationId,
          followupNote: addFollowUpNotificationMeta.followupNote,
          followupDate: addFollowUpNotificationMeta.followupDate,
          candidates: addFollowUpNotificationMeta.candidates,
          triggerUserId: user.id ?? '',
          triggerUserName: user.name ?? '',
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Bulk update: failed to send bulk follow-up notification',
        );
      }
    }

    // Bulk status update: admin/hr get one bulk
    if (statusUpdateNotificationMeta && user.organizationId) {
      try {
        await NotificationService.notifyBulkCandidateStatusUpdated({
          organizationId: user.organizationId,
          newStatus: statusUpdateNotificationMeta.newStatus,
          nextStep: statusUpdateNotificationMeta.nextStep,
          statusMessage: statusUpdateNotificationMeta.statusMessage,
          candidates: statusUpdateNotificationMeta.candidates,
          triggerUserId: user.id ?? '',
          triggerUserName: user.name ?? '',
          triggerUserEmail: user.email,
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Bulk update: failed to send bulk status update notification',
        );
      }
    }

    const finalResult: BulkUpdateResult = {
      success: true,
      updatedCount: totalUpdatedCount,
      failedCount: totalFailedCount,
      skippedCount: totalSkippedCount > 0 ? totalSkippedCount : undefined,
      candidatesToBroadcast: uniqueCandidatesToBroadcast,
      message: messages.join('; '),
      meta: moveJobMeta,
    };

    return NextResponse.json(finalResult);
  } catch (error) {
    logger.error({ error, url: req.url }, 'Bulk update error');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 },
    );
  }
}
