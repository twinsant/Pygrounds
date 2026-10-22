export const PANEL_LAYOUT_STORAGE_KEY = 'pygrounds-panels'
export const PANEL_SIZE_PROPERTIES = ['--file-width', '--agent-width', '--editor-height']

export function parsePanelLayout(raw) {
  if (raw === null) return {}
  const layout = JSON.parse(raw)
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)
    || Object.entries(layout).some(([key, value]) => !PANEL_SIZE_PROPERTIES.includes(key)
      || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100_000)) {
    throw new Error('Invalid saved panel layout')
  }
  return layout
}

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
