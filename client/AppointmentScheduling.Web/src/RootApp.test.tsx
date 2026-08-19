import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RootApp from './RootApp'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('application routes', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })

  it('shows the patient workflow at the root path', async () => {
    vi.stubGlobal('fetch', fetchMock.mockResolvedValueOnce(jsonResponse([])))
    window.history.replaceState({}, '', '/')

    render(<RootApp />)

    expect(
      await screen.findByRole('heading', { name: /book or manage an appointment/i }),
    ).toBeInTheDocument()
  })

  it('shows the staff workflow at the staff path', async () => {
    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/staff')

    render(<RootApp />)

    expect(
      await screen.findByRole('heading', {
        name: /manage appointment scheduling/i,
      }),
    ).toBeInTheDocument()
  })
})
