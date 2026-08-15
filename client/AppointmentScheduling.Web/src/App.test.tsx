import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type {
  AvailableAppointmentSlot,
  Booking,
} from './api/appointmentApi'

const availableSlot: AvailableAppointmentSlot = {
  appointmentSlotId: 42,
  availabilitySessionId: 7,
  clinicianId: 1,
  clinicianName: 'Dr Maya Patel',
  clinicianRole: 'General Practitioner',
  startsAtUtc: '2026-08-17T09:10:00Z',
  endsAtUtc: '2026-08-17T09:30:00Z',
}

const activeBooking: Booking = {
  bookingId: 12,
  appointmentSlotId: 42,
  patientReference: 'PAT-001',
  patientDisplayName: 'Alex Morgan',
  status: 'Active',
  bookedAtUtc: '2026-08-15T08:00:00Z',
  cancelledAtUtc: null,
  startsAtUtc: '2026-08-17T09:10:00Z',
  endsAtUtc: '2026-08-17T09:30:00Z',
}

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function selectSlotAndEnterPatientDetails() {
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('radio', { name: /Dr Maya Patel/i }),
  )
  await user.type(
    screen.getByRole('textbox', { name: /^patient reference$/i }),
    'PAT-001',
  )
  await user.type(
    screen.getByRole('textbox', { name: /^patient name$/i }),
    'Alex Morgan',
  )
  return user
}

describe('patient appointment workflow', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads and displays available appointments', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([availableSlot]))

    render(<App />)

    expect(
      screen.getByRole('heading', { name: /book or manage an appointment/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Oakfield Medical Centre')).toBeInTheDocument()
    expect(
      await screen.findByRole('radio', { name: /Dr Maya Patel/i }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/slots',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('books the selected appointment and displays confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
      .mockResolvedValueOnce(jsonResponse(activeBooking, 201))
      .mockResolvedValueOnce(jsonResponse([]))
    render(<App />)
    const user = await selectSlotAndEnterPatientDetails()

    await user.click(screen.getByRole('button', { name: /book appointment/i }))

    expect(
      await screen.findByText('Booking 12 has been confirmed.'),
    ).toBeInTheDocument()
    const bookingCard = screen.getByRole('article')
    expect(
      within(bookingCard).getByRole('heading', { name: 'Booking 12' }),
    ).toBeInTheDocument()
    expect(within(bookingCard).getByText('Active')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/bookings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          appointmentSlotId: 42,
          patientReference: 'PAT-001',
          patientDisplayName: 'Alex Morgan',
        }),
      }),
    )
  })

  it('reports a booking conflict and refreshes stale availability', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
      .mockResolvedValueOnce(
        jsonResponse(
          { detail: 'The appointment slot has already been booked.' },
          409,
        ),
      )
      .mockResolvedValueOnce(jsonResponse([]))
    render(<App />)
    const user = await selectSlotAndEnterPatientDetails()

    await user.click(screen.getByRole('button', { name: /book appointment/i }))

    expect(
      await screen.findByText('The appointment slot has already been booked.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/there are no appointments available/i),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('loads and cancels an existing booking after confirmation', async () => {
    const cancelledBooking: Booking = {
      ...activeBooking,
      status: 'Cancelled',
      cancelledAtUtc: '2026-08-15T09:00:00Z',
    }
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(activeBooking))
      .mockResolvedValueOnce(jsonResponse(cancelledBooking))
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
    render(<App />)
    const user = userEvent.setup()
    await screen.findByText(/there are no appointments available/i)

    await user.type(
      screen.getByRole('textbox', { name: /booking reference/i }),
      '12',
    )
    await user.click(screen.getByRole('button', { name: /find booking/i }))
    await user.click(
      await screen.findByRole('button', { name: /cancel this booking/i }),
    )
    expect(
      screen.getByRole('heading', { name: /are you sure/i }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /yes, cancel booking/i }),
    )

    expect(
      await screen.findByText('Booking 12 has been cancelled.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /cancel this booking/i }),
    ).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/bookings/12/cancel',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('validates a booking reference before calling the API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    render(<App />)
    const user = userEvent.setup()
    await screen.findByText(/there are no appointments available/i)

    await user.type(
      screen.getByRole('textbox', { name: /booking reference/i }),
      '0',
    )
    await user.click(screen.getByRole('button', { name: /find booking/i }))

    expect(
      screen.getByText(/enter a valid booking reference greater than zero/i),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('allows availability loading to be retried after an API error', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ detail: 'Appointments are temporarily unavailable.' }, 503),
      )
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
    render(<App />)

    expect(
      await screen.findByText('Appointments are temporarily unavailable.'),
    ).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(
      await screen.findByRole('radio', { name: /Dr Maya Patel/i }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
