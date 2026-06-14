import "server-only";

import { NOTIFICATION_TYPES, TRANSITIONS_WITH_NOTIFICATIONS } from "@/domain/notification/types";

export function getNotificationHealth() {
  return {
    ok: true as const,
    notificationTypes: Object.values(NOTIFICATION_TYPES),
    transitionNotifications: [...TRANSITIONS_WITH_NOTIFICATIONS],
    features: {
      inAppNotifications: true,
      emailNotifications: true,
      transitionHooks: true,
      overdueReviewReminders: true,
    },
  };
}
