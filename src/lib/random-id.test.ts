import { describe, expect, it } from 'vitest'

import { randomUuid } from './random-id'

describe('randomUuid', () => {
  it('uses the native implementation when available', () => {
    expect(randomUuid({ randomUUID: () => 'native-uuid' })).toBe('native-uuid')
  })

  it('works when an HTTP browser does not expose crypto.randomUUID', () => {
    const value = randomUuid({
      getRandomValues(array) {
        array.fill(0)
        return array
      },
    })

    expect(value).toBe('00000000-0000-4000-8000-000000000000')
  })
})
