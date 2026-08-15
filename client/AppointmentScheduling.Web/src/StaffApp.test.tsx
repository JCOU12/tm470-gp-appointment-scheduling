import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StaffApp from './StaffApp'
import type {
  AvailabilitySession,
  Clinician,
  StaffBooking,
  UnavailablePeriod,
} from './api/staffApi'

const clinicians: Clinician[] = [
  {
    clinicianId: 1,
    name: 'Dr Maya Patel',
    role: 'General Practitioner',
  },
]

const activeBooking: StaffBooking = {
  bookingId: 12,
  status: 'Active',
  bookedAtUtc: '2026-08-15T08:00:00Z',
  cancelledAtUtc: null,
  appointmentSlotId: 42,
  startsAtUtc: '2026-08-20T08:00:00Z',
  endsAtUtc: '2026-08-20T08:15:00Z',
  clinicianId: 1,
  clinicianName: 'Dr Maya Patel',
  patientReference: 'PAT-001',
  patientDisplayName: 'Alex Morgan',
}

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function arrangeInitialLoad(bookings: StaffBooking[] = [activeBooking]) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(clinicians))
    .mockResolvedValueOnce(jsonResponse(bookings))
}

describe('staff appointment workflow', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads clinicians and displays staff bookings', async () => {
    arrangeInitialLoad()

    render(<StaffApp />)

    expect(
      screen.getByRole('heading', { name: /manage appointment scheduling/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('PAT-001')).toBeInTheDocument()
    expect(screen.getByText('1 booking found')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /staff scheduling/i }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('creates an availability session and reports generated slots', async () => {
    const createdSession: AvailabilitySession = {
      availabilitySessionId: 7,
      clinicianId: 1,
      startsAtUtc: '2026-08-20T08:00:00Z',
      endsAtUtc: '2026-08-20T09:00:00Z',
      slotDurationMinutes: 30,
      appointmentSlots: [
        {
          appointmentSlotId: 41,
          startsAtUtc: '2026-08-20T08:00:00Z',
          endsAtUtc: '2026-08-20T08:30:00Z',
        },
        {
          appointmentSlotId: 42,
          startsAtUtc: '2026-08-20T08:30:00Z',
          endsAtUtc: '2026-08-20T09:00:00Z',
        },
      ],
    }
    arrangeInitialLoad([])
    fetchMock.mockResolvedValueOnce(jsonResponse(createdSession, 201))
    render(<StaffApp />)
    const user = userEvent.setup()
    await screen.findByText('0 bookings found')

    await user.selectOptions(
      screen.getByLabelText('Clinician', { selector: '#session-clinician' }),
      '1',
    )
    await user.type(screen.getByLabelText('Session start'), '2026-08-20T09:00')
    await user.type(screen.getByLabelText('Session end'), '2026-08-20T10:00')
    await user.clear(screen.getByLabelText('Appointment length in minutes'))
    await user.type(screen.getByLabelText('Appointment length in minutes'), '30')
    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(
      await screen.findByText(
        'Availability session created with 2 appointment slots.',
      ),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/staff/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clinicianId: 1,
          startsAtUtc: new Date('2026-08-20T09:00').toISOString(),
          endsAtUtc: new Date('2026-08-20T10:00').toISOString(),
          slotDurationMinutes: 30,
        }),
      }),
    )
  })

  it('adds a clinician unavailable period', async () => {
    const createdPeriod: UnavailablePeriod = {
      unavailablePeriodId: 4,
      clinicianId: 1,
      startsAtUtc: '2026-08-20T11:00:00Z',
      endsAtUtc: '2026-08-20T12:00:00Z',
    }
    arrangeInitialLoad([])
    fetchMock.mockResolvedValueOnce(jsonResponse(createdPeriod, 201))
    render(<StaffApp />)
    const user = userEvent.setup()
    await screen.findByText('0 bookings found')

    await user.selectOptions(
      screen.getByLabelText('Clinician', { selector: '#period-clinician' }),
      '1',
    )
    await user.type(screen.getByLabelText('Unavailable from'), '2026-08-20T12:00')
    await user.type(screen.getByLabelText('Unavailable until'), '2026-08-20T13:00')
    await user.click(
      screen.getByRole('button', { name: /add unavailable period/i }),
    )

    expect(
      await screen.findByText('The clinician unavailable period has been added.'),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/staff/unavailable-periods',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('applies and clears booking filters', async () => {
    arrangeInitialLoad()
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([activeBooking]))
    render(<StaffApp />)
    const user = userEvent.setup()
    await screen.findByText('1 booking found')

    const filters = screen.getByRole('button', { name: /apply filters/i })
      .closest('form')
    expect(filters).not.toBeNull()
    const filterForm = within(filters!)

    await user.selectOptions(filterForm.getByLabelText('Clinician'), '1')
    await user.type(filterForm.getByLabelText('From date'), '2026-08-20')
    await user.type(filterForm.getByLabelText('To date'), '2026-08-20')
    await user.selectOptions(filterForm.getByLabelText('Status'), 'Cancelled')
    await user.click(filterForm.getByRole('button', { name: /apply filters/i }))

    expect(await screen.findByText('0 bookings found')).toBeInTheDocument()
    const expectedQuery = new URLSearchParams({
      clinicianId: '1',
      fromUtc: new Date('2026-08-20T00:00').toISOString(),
      toUtc: new Date('2026-08-21T00:00').toISOString(),
      status: 'Cancelled',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/staff/bookings?${expectedQuery.toString()}`,
      expect.objectContaining({ headers: expect.any(Object) }),
    )

    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(await screen.findByText('1 booking found')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/staff/bookings',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('shows scheduling conflicts returned by the API', async () => {
    arrangeInitialLoad([])
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { detail: 'The availability session overlaps an existing session.' },
        409,
      ),
    )
    render(<StaffApp />)
    const user = userEvent.setup()
    await screen.findByText('0 bookings found')

    await user.selectOptions(
      screen.getByLabelText('Clinician', { selector: '#session-clinician' }),
      '1',
    )
    await user.type(screen.getByLabelText('Session start'), '2026-08-20T09:00')
    await user.type(screen.getByLabelText('Session end'), '2026-08-20T10:00')
    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(
      await screen.findByText(
        'The availability session overlaps an existing session.',
      ),
    ).toBeInTheDocument()
  })
})
