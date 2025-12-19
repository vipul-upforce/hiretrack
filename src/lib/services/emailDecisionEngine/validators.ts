import {
  NotificationDecisionContext,
  NotificationDecisionResult,
  UserLean,
} from './types';
import { ELIGIBLE_ROLES, createResult } from './helpers';

export function validatePreconditions(
  context: NotificationDecisionContext,
): NotificationDecisionResult | null {
  if (!context.recipientUserId) {
    return createResult(
      false,
      'No recipient user ID provided',
      'org-default',
      context.notificationCategory,
    );
  }
  if (
    context.triggererUserId &&
    context.triggererUserId === context.recipientUserId
  ) {
    return createResult(
      false,
      'User triggered the action themselves',
      'org-default',
      context.notificationCategory,
    );
  }
  return null;
}

export function validateUserEligibility(
  user: UserLean | null,
  category: 'email' | 'inApp',
): NotificationDecisionResult | null {
  if (!user)
    return createResult(
      false,
      'Recipient user not found',
      'org-default',
      category,
    );
  if (!ELIGIBLE_ROLES.includes(user.role as (typeof ELIGIBLE_ROLES)[number])) {
    return createResult(
      false,
      `User role '${user.role}' is not eligible for notifications`,
      'org-default',
      category,
    );
  }
  return null;
}

