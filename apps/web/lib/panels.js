export function getResizeMetrics(size, adjacentSize, minimum, adjacentMinimum, compact = false) {
  const available = size + adjacentSize
  const min = Math.min(minimum, compact ? available * 0.45 : available)
  const otherMin = compact ? Math.min(adjacentMinimum, available * 0.35) : adjacentMinimum
  const max = Math.max(min, available - otherMin)
  return { value: size, min, max }
}

export function clampPanelSize(size, { min, max }) {
  return Math.min(max, Math.max(min, size))
}
