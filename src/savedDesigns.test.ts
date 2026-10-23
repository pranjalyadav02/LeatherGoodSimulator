import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIGURATION } from './catalog'
import {
  loadSavedDesigns,
  isSavedSnapshot,
  resolveSavedDesign,
  saveDesignVersion,
  SAVED_DESIGNS_KEY,
} from './savedDesigns'

function mockStorage() {
  const entries = new Map<string, string>()
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  }
  vi.stubGlobal('localStorage', storage)
  return entries
}

afterEach(() => vi.unstubAllGlobals())

describe('browser-local design versions', () => {
  it('saves immutable snapshots with incrementing versions and restores a selected version', () => {
    const storage = mockStorage()
    const first = saveDesignVersion([], DEFAULT_CONFIGURATION, 'design-12345678')
    const second = saveDesignVersion(
      first.designs,
      { ...DEFAULT_CONFIGURATION, colorId: 'espresso' },
      'design-12345678',
    )

    expect(first.saved.version).toBe(1)
    expect(second.saved.version).toBe(2)
    expect(resolveSavedDesign(second.designs, 'design-12345678', 1)?.colorId).toBe('saddle')
    expect(resolveSavedDesign(second.designs, 'design-12345678', 2)?.colorId).toBe('espresso')
    expect(isSavedSnapshot(second.designs, 'design-12345678', 2, { ...DEFAULT_CONFIGURATION, colorId: 'espresso' })).toBe(true)
    expect(isSavedSnapshot(second.designs, 'design-12345678', 2, DEFAULT_CONFIGURATION)).toBe(false)
    expect(JSON.parse(storage.get(SAVED_DESIGNS_KEY) ?? '[]')).toHaveLength(2)
  })

  it('does not save an invalid configuration', () => {
    mockStorage()
    expect(() => saveDesignVersion([], { ...DEFAULT_CONFIGURATION, widthCm: 100 })).toThrow('invalid options')
  })

  it('rejects malformed saved storage instead of silently accepting it', () => {
    const storage = mockStorage()
    storage.set(SAVED_DESIGNS_KEY, '{broken')
    expect(() => loadSavedDesigns()).toThrow('unreadable')
  })
})
