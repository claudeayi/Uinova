const memoryQuota: Record<string, { [key: string]: number }> = {};

export function checkQuota(userId: string, feature: string, limit = 100) {
  memoryQuota[userId] = memoryQuota[userId] || {};
  memoryQuota[userId][feature] = (memoryQuota[userId][feature] || 0) + 1;
  return memoryQuota[userId][feature] <= limit;
}
