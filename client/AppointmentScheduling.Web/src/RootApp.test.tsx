import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
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
    vi.unstubAllGlobals()
  })

  it('shows the patient workflow at the root path', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootApp />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: /manage your appointments/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveClass('nhsuk-header')
    expect(screen.getByRole('contentinfo')).toHaveClass('nhsuk-footer')
    expect(
      screen.getByRole('link', { name: /skip to main content/i }),
    ).toHaveClass('nhsuk-skip-link')
  })

  it('shows the staff workflow at the staff path', async () => {
    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <RootApp />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: /manage appointment scheduling/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveClass('nhsuk-main-wrapper')
  })
})
