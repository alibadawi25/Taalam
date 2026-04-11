function normalizeCount(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.trunc(numericValue));
}

export function getCourseLabel(count) {
  const normalizedCount = normalizeCount(count);

  if (normalizedCount === 1) {
    return "دورة";
  }

  if (normalizedCount === 2) {
    return "دورتين";
  }

  if (normalizedCount >= 3 && normalizedCount <= 10) {
    return "دورات";
  }

  return "دورة";
}

export function formatCourseCount(count) {
  const normalizedCount = normalizeCount(count);
  if (normalizedCount === 1 || normalizedCount === 2) {
    return getCourseLabel(normalizedCount);
  }

  return `${normalizedCount} ${getCourseLabel(normalizedCount)}`;
}
