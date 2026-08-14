import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getAvailableSlots } from './appointmentApi'

describe('appointment API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a fallback message when an error response is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response('Unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    const request = getAvailableSlots()

    await expect(request).rejects.toEqual(
      new ApiError('The request could not be completed.', 503),
    )
  })
})
