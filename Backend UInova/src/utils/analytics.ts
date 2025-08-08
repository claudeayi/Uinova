const logs: any[] = [];

export function trackEvent(userId: number, type: string, data: any = {}) {
  logs.push({ userId, type, ...data, date: new Date() });
}

export function getEvents(filter: Partial<{ userId: number; type: string }>) {
  return logs.filter(log =>
    (!filter.userId || log.userId === filter.userId) &&
    (!filter.type || log.type === filter.type)
  );
}
