import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getHomeBanners,
  getHomeStats,
  saveHomeStats,
} from './scaffolded-management'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('portal home without an existing configuration', () => {
  it('loads empty statistics instead of reading fields from null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200 })))

    await expect(getHomeStats()).resolves.toEqual({
      items: [],
      version: undefined,
    })
  })

  it('loads an empty banner state instead of reading fields from null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200 })))

    await expect(getHomeBanners()).resolves.toEqual({
      items: [],
      status: {
        current_revision: 0,
        published_revision: null,
        publication_version: null,
        version: 0,
        published_at: null,
      },
    })
  })

  it('creates the first home configuration with version zero', async () => {
    const backend = vi.fn()
      .mockResolvedValueOnce(new Response('null', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1 }), { status: 200 }))
    vi.stubGlobal('fetch', backend)

    await expect(saveHomeStats([
      { label: '合作国家', value: '10+' },
    ])).resolves.toEqual({
      items: [
        { id: 'stat-0', label: '合作国家', value: '10+' },
      ],
      version: 1,
    })

    const [, request] = backend.mock.calls[1] as [string, RequestInit]
    expect(JSON.parse(String(request.body))).toEqual({
      expected_version: 0,
      stats: [{ label: '合作国家', value: '10+' }],
      banners: [],
      sections: [],
    })
  })
})
