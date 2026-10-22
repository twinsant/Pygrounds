import { describe, expect, test } from 'bun:test'
import { clampPanelSize, getResizeMetrics } from '../lib/panels'

describe('panel resize limits', () => {
  test('file width leaves the editor usable without taking space from Agent', () => {
    const bounds = getResizeMetrics(200, 868, 140, 320)
    expect(bounds).toEqual({ value: 200, min: 140, max: 748 })
    expect(clampPanelSize(0, bounds)).toBe(140)
    expect(clampPanelSize(5000, bounds)).toBe(748)
    expect(clampPanelSize(320, bounds)).toBe(320)
  })

  test('Agent width preserves a minimum workbench width', () => {
    const bounds = getResizeMetrics(360, 868, 240, 320)
    expect(bounds.min).toBe(240)
    expect(bounds.max).toBe(908)
    expect(clampPanelSize(360 - 100, bounds)).toBe(260)
    expect(clampPanelSize(360 + 2000, bounds)).toBe(908)
  })

  test('editor and console both retain minimum usable heights', () => {
    const bounds = getResizeMetrics(580, 266, 180, 140, true)
    expect(bounds).toEqual({ value: 580, min: 180, max: 706 })
    expect(clampPanelSize(-1000, bounds)).toBe(180)
    expect(846 - clampPanelSize(10000, bounds)).toBe(140)
  })

  test('short viewports shrink minimum heights proportionally instead of overflowing', () => {
    for (const available of [0, 50, 100, 200, 300]) {
      const bounds = getResizeMetrics(available * 0.6, available * 0.4, 180, 140, true)
      expect(bounds.min).toBeCloseTo(available * 0.45)
      expect(bounds.max).toBeCloseTo(available * 0.65)
      expect(clampPanelSize(10000, bounds)).toBeLessThanOrEqual(available)
      expect(available - clampPanelSize(10000, bounds)).toBeGreaterThanOrEqual(0)
    }
  })

  test('limits adapt to the current viewport, not stale drag-start dimensions', () => {
    const wide = getResizeMetrics(400, 700, 140, 320)
    const narrow = getResizeMetrics(200, 320, 140, 320)
    expect(clampPanelSize(600, wide)).toBe(600)
    expect(clampPanelSize(600, narrow)).toBe(200)
  })
})
