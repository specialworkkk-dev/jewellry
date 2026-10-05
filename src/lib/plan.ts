const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function getPlanReminderStatus(planEndsAt?: Date | null) {
  if (!planEndsAt) {
    return { expired: false, withinReminderWindow: false, daysRemaining: 0 };
  }

  const millisecondsRemaining = planEndsAt.getTime() - Date.now();
  const expired = millisecondsRemaining < 0;
  return {
    expired,
    withinReminderWindow: expired || millisecondsRemaining <= 3 * DAY_IN_MILLISECONDS,
    daysRemaining: expired ? 0 : Math.max(1, Math.ceil(millisecondsRemaining / DAY_IN_MILLISECONDS)),
  };
}
