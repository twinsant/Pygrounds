import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  clampPanelSize, getResizeMetrics, PANEL_LAYOUT_STORAGE_KEY,
  PANEL_SIZE_PROPERTIES, parsePanelLayout,
} from '../lib/panels'

describe('saved panel layout', () => {
  test('restores all three sizes including fractional editor heights', () => {
    expect(PANEL_LAYOUT_STORAGE_KEY).toBe('pygrounds-panels')
    const layout = { '--file-width': 250, '--agent-width': 410, '--editor-height': 592.953125 }
    expect(parsePanelLayout(JSON.stringify(layout))).toEqual(layout)
    expect(Object.keys(layout).sort()).toEqual([...PANEL_SIZE_PROPERTIES].sort())
    expect(parsePanelLayout(null)).toEqual({})
    expect(parsePanelLayout('{}')).toEqual({})
    expect(parsePanelLayout('{"--file-width":0}')).toEqual({ '--file-width': 0 })
  })

  test('rejects malformed storage and arbitrary CSS properties instead of applying them', () => {
    for (const raw of [
      '', 'invalid', 'null', '[]', '42', '"large"', '{"--file-width":"250px"}',
      '{"--file-width":null}', '{"--file-width":-1}', '{"--file-width":100001}',
      '{"--file-width":1e999}', '{"--canvas":"red"}', '{"__proto__":{}}',
    ]) {
      expect(() => parsePanelLayout(raw), raw).toThrow()
    }
  })

  test('resetting one size preserves the others and smaller viewports clamp restored sizes', () => {
    const layout = parsePanelLayout('{"--file-width":800,"--agent-width":400,"--editor-height":600}')
    delete layout['--file-width']
    expect(parsePanelLayout(JSON.stringify(layout))).toEqual({ '--agent-width': 400, '--editor-height': 600 })
    const bounds = getResizeMetrics(200, 320, 140, 320)
    expect(clampPanelSize(800, bounds)).toBe(200)
  })
})

test('editor track is shared with Agent so the composer follows console header bottom', () => {
  const home = readFileSync(new URL('../styles/Home.module.css', import.meta.url), 'utf8')
  const agent = readFileSync(new URL('../styles/Agent.module.css', import.meta.url), 'utf8')
  const workspace = home.match(/\.workspace\s*\{([^}]+)\}/)?.[1]
  expect(workspace).toContain('--editor-track:')
  expect(home).toContain('grid-template-rows: var(--editor-track) var(--panel-handle-size)')
  expect(agent).toContain('flex: 0 0 calc(var(--editor-track) + var(--panel-handle-size) - 1px);')
})

test('all panel headers share one fixed height so their borders align', () => {
  const home = readFileSync(new URL('../styles/Home.module.css', import.meta.url), 'utf8')
  const agent = readFileSync(new URL('../styles/Agent.module.css', import.meta.url), 'utf8')
  expect(home).toContain('--panel-header-height: 42px;')
  for (const [source, selector] of [[home, 'panelHeading'], [home, 'panelToolbar'], [agent, 'heading']]) {
    const rule = source.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`))?.[1]
    expect(rule).toContain('height: var(--panel-header-height);')
    expect(rule).toContain('flex: 0 0 var(--panel-header-height);')
  }
})

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
