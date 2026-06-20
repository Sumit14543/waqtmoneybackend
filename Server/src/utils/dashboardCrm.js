const getStageKey = (item = {}, index = 0) =>
  String(
    item.stageKey ||
      item.statusCode ||
      item.publicStatus ||
      item.title ||
      item.status ||
      `timeline-item-${index}`
  )
    .trim()
    .toLowerCase();

const getOccurredAt = (item = {}) => {
  const timestamp = new Date(item.occurredAt || item.createdAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getProgress = (item = {}) => {
  const progress = Number(item.progressPercent);
  return Number.isFinite(progress) ? progress : null;
};

export const normalizeDashboardCrmTimeline = (timeline) => {
  if (!Array.isArray(timeline)) return [];

  const latestByStage = new Map();

  timeline.filter(Boolean).forEach((item, index) => {
    const stageKey = getStageKey(item, index);
    const candidate = { item, index, stageKey, occurredAt: getOccurredAt(item) };
    const existing = latestByStage.get(stageKey);

    if (
      !existing ||
      candidate.occurredAt > existing.occurredAt ||
      (candidate.occurredAt === existing.occurredAt && candidate.index > existing.index)
    ) {
      latestByStage.set(stageKey, candidate);
    }
  });

  return [...latestByStage.values()]
    .sort((left, right) => {
      const leftProgress = getProgress(left.item);
      const rightProgress = getProgress(right.item);

      if (leftProgress !== null && rightProgress !== null && leftProgress !== rightProgress) {
        return leftProgress - rightProgress;
      }

      if (left.occurredAt !== right.occurredAt) {
        return left.occurredAt - right.occurredAt;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
};
