import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getHomeBanners,
  getHomeStats,
  listManagementCountryOptions,
  listHomeSection,
  saveHomeStats,
} from './scaffolded-management'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('portal home section sources', () => {
  it('loads selectable countries from the public enabled-country projection', async () => {
    const backend = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: '1', code: 'MY', name: '马来西亚', status: 1 }],
      next_cursor: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', backend)

    await expect(listManagementCountryOptions()).resolves.toEqual([
      { code: 'MY', name: '马来西亚' },
    ])
    expect(backend.mock.calls[0]?.[0]).toBe('/api/public/portal/countries?limit=100')
  })

  it.each([
    ['news', 'news'],
    ['trade', 'invest'],
    ['association', 'association'],
    ['activity', 'activity'],
    ['park', 'park'],
  ])('uses the CMS contentType contract for %s', async (sectionKey, contentType) => {
    const backend = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [],
      total: 0,
      page: 1,
      size: 8,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', backend)

    await listHomeSection(sectionKey, { limit: 8 })

    expect(backend.mock.calls[0]?.[0]).toBe(
      `/api/management/cms/articles?contentType=${contentType}&page=1&size=8`,
    )
  })

  it('uses the formal education product type and page contract', async () => {
    const backend = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [],
      total: 0,
      page: 1,
      size: 8,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', backend)

    await expect(listHomeSection('education', { limit: 8 })).resolves.toEqual({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    expect(backend.mock.calls[0]?.[0]).toBe(
      '/api/management/products?type=edu&page=1&size=8',
    )
  })

  it('resolves configured partners through the list contract', async () => {
    const backend = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          key: 'partners',
          title: '合作伙伴',
          items: [{ resource_type: 'partner', resource_id: '9001' }],
        },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ id: '9001', name: '东盟合作伙伴', status: 1 }],
        next_cursor: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', backend)

    await expect(listHomeSection('partners', { homeOnly: true })).resolves.toMatchObject({
      items: [{ id: '9001', title: '东盟合作伙伴', is_home: true }],
    })
    expect(backend.mock.calls.map(([url]) => url)).toEqual([
      '/api/management/portal/site-config/sections',
      '/api/management/portal/partners?limit=100',
    ])
  })
})

describe('portal home without an existing configuration', () => {
  it('loads empty statistics instead of reading fields from null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200 })))

    await expect(getHomeStats()).resolves.toEqual({
      items: [],
    })
  })

  it('loads an empty banner state instead of reading fields from null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200 })))

    await expect(getHomeBanners()).resolves.toEqual({
      items: [],
    })
  })

  it('saves statistics through the direct site-config contract', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => array.fill(7),
    })
    const backend = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', backend)

    await expect(saveHomeStats([
      { label: '合作国家', value: '10+' },
    ])).resolves.toEqual({
      items: [
        { id: 'stat-0', label: '合作国家', value: '10+' },
      ],
    })

    expect(backend).toHaveBeenCalledTimes(1)
    const [url, request] = backend.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/management/portal/site-config/stats')
    expect(JSON.parse(String(request.body))).toEqual({
      value: [{ label: '合作国家', value: '10+' }],
      remark: '首页统计数字',
    })
  })
})
