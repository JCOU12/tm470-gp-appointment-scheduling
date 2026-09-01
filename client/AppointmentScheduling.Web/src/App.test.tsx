import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AvailableAppointmentSlot, Booking } from './api/appointmentApi'

const availableSlot: AvailableAppointmentSlot = {
  appointmentSlotId: 42,
  availabilitySessionId: 7,
  clinicianId: 1,
  clinicianName: 'Dr Maya Patel',
  clinicianRole: 'General Practitioner',
  startsAtUtc: '2026-08-27T09:10:00Z',
  endsAtUtc: '2026-08-27T09:30:00Z',
}

const activeBooking: Booking = {
  bookingReference: 'APT-7K4M9Q2R',
  appointmentSlotId: 42,
  patientDisplayName: 'Alex Morgan',
  status: 'Active',
  bookedAtUtc: '2026-08-24T08:00:00Z',
  cancelledAtUtc: null,
  startsAtUtc: '2026-08-27T09:10:00Z',
  endsAtUtc: '2026-08-27T09:30:00Z',
}

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

async function reachReviewPage() {
  const user = userEvent.setup()
  await user.click(
    screen.getByRole('link', { name: /^book an appointment$/i }),
  )
  const appointment = await screen.findByRole('radio', {
    name: /Dr Maya Patel/i,
  })
  expect(screen.getByRole('main')).toHaveFocus()
  expect(screen.getByRole('main')).toHaveClass(
    'nhsuk-skip-link-focused-element',
  )
  await user.click(appointment)
  await user.click(screen.getByRole('button', { name: /continue/i }))

  expect(
    screen.getByRole('heading', { name: /enter your name/i }),
  ).toBeInTheDocument()
  await user.type(
    screen.getByRole('textbox', { name: /^patient name$/i }),
    'Alex Morgan',
  )
  await user.click(screen.getByRole('button', { name: /continue/i }))

  expect(
    screen.getByRole('heading', { name: /check your appointment details/i }),
  ).toBeInTheDocument()
  return user
}

describe('patient appointment journey', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('starts with separate booking and management tasks', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { name: /manage your appointments/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /^book an appointment$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /view or cancel a booking/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).not.toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('books an appointment through selection, details and review pages', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
      .mockResolvedValueOnce(jsonResponse(activeBooking, 201))
    renderApp()
    const user = await reachReviewPage()

    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /confirm appointment/i }),
    )

    expect(
      await screen.findByRole('heading', { name: /appointment confirmed/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Your appointment is confirmed. Make a note of your booking reference: APT-7K4M9Q2R.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass(
      'nhsuk-notification-banner--success',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/bookings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          appointmentSlotId: 42,
          patientDisplayName: 'Alex Morgan',
        }),
      }),
    )
  })

  it('returns a booking conflict to refreshed appointment selection', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
      .mockResolvedValueOnce(
        jsonResponse(
          { detail: 'The appointment slot has already been booked.' },
          409,
        ),
      )
      .mockResolvedValueOnce(jsonResponse([]))
    renderApp()
    const user = await reachReviewPage()

    await user.click(
      screen.getByRole('button', { name: /confirm appointment/i }),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /choose an appointment/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The appointment slot has already been booked.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/there are no appointments available/i),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('finds and cancels a booking on dedicated confirmation pages', async () => {
    const cancelledBooking: Booking = {
      ...activeBooking,
      status: 'Cancelled',
      cancelledAtUtc: '2026-08-24T09:00:00Z',
    }
    fetchMock
      .mockResolvedValueOnce(jsonResponse(activeBooking))
      .mockResolvedValueOnce(jsonResponse(cancelledBooking))
    renderApp()
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('link', { name: /view or cancel a booking/i }),
    )
    await user.type(
      screen.getByRole('textbox', { name: /booking reference/i }),
      'apt-7k4m9q2r',
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
      await screen.findByRole('heading', { name: /appointment cancelled/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Booking APT-7K4M9Q2R has been cancelled.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/bookings/APT-7K4M9Q2R/cancel',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('validates a booking reference before navigating to a booking', async () => {
    renderApp('/bookings')
    const user = userEvent.setup()

    await user.type(
      screen.getByRole('textbox', { name: /booking reference/i }),
      '12',
    )
    await user.click(screen.getByRole('button', { name: /find booking/i }))

    expect(
      screen.getByText(/enter a booking reference in the format APT-/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /please check and try again/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('paginates long appointment lists and preserves the selection', async () => {
    const availableSlots = Array.from({ length: 7 }, (_, index) => ({
      ...availableSlot,
      appointmentSlotId: index + 1,
      clinicianName: `Clinician ${index + 1}`,
      startsAtUtc: `2026-08-27T${String(9 + index).padStart(2, '0')}:00:00Z`,
      endsAtUtc: `2026-08-27T${String(9 + index).padStart(2, '0')}:20:00Z`,
    }))
    fetchMock.mockResolvedValueOnce(jsonResponse(availableSlots))
    renderApp('/appointments')
    const user = userEvent.setup()

    expect(await screen.findAllByRole('radio')).toHaveLength(6)
    expect(screen.queryByRole('radio', { name: /Clinician 7/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    const finalAppointment = screen.getByRole('radio', {
      name: /Clinician 7/i,
    })
    await user.click(finalAppointment)
    expect(finalAppointment).toBeChecked()

    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.queryByRole('radio', { name: /Clinician 7/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(
      screen.getByRole('radio', { name: /Clinician 7/i }),
    ).toBeChecked()
  })

  it('allows availability loading to be retried after an API error', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { detail: 'Appointments are temporarily unavailable.' },
          503,
        ),
      )
      .mockResolvedValueOnce(jsonResponse([availableSlot]))
    renderApp('/appointments')

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

  it('redirects an incomplete journey to appointment selection', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    renderApp('/appointments/review')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /choose an appointment/i,
      }),
    ).toBeInTheDocument()
  })
})
