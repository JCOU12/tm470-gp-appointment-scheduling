import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
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
  bookingReference: 'APT-7K4M9Q2R',
  status: 'Active',
  bookedAtUtc: '2026-08-15T08:00:00Z',
  cancelledAtUtc: null,
  appointmentSlotId: 42,
  startsAtUtc: '2026-08-20T08:00:00Z',
  endsAtUtc: '2026-08-20T08:15:00Z',
  clinicianId: 1,
  clinicianName: 'Dr Maya Patel',
  patientDisplayName: 'Alex Morgan',
}

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderStaff(path = '/staff') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/staff/*" element={<StaffApp />} />
      </Routes>
    </MemoryRouter>,
  )
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

  it('starts with separate staff scheduling tasks', () => {
    renderStaff()

    expect(
      screen.getByRole('heading', { name: /manage appointment scheduling/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /create availability/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /add unavailable time/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /review bookings/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /staff scheduling/i }),
    ).toHaveAttribute('aria-current', 'page')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates availability and shows a dedicated confirmation page', async () => {
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
    fetchMock
      .mockResolvedValueOnce(jsonResponse(clinicians))
      .mockResolvedValueOnce(jsonResponse(createdSession, 201))
    renderStaff()
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('link', { name: /create availability/i }),
    )
    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('main')).toHaveClass(
      'nhsuk-skip-link-focused-element',
    )
    await screen.findByRole('heading', {
      name: /create an availability session/i,
    })
    await user.selectOptions(screen.getByLabelText('Clinician'), '1')
    await user.type(
      screen.getByLabelText('Clinician available from'),
      '2026-08-20T09:00',
    )
    await user.type(
      screen.getByLabelText('Clinician available until'),
      '2026-08-20T10:00',
    )
    await user.clear(
      screen.getByLabelText('Length of each appointment in minutes'),
    )
    await user.type(
      screen.getByLabelText('Length of each appointment in minutes'),
      '30',
    )
    expect(
      screen.getByText(
        'This will create 2 appointments between 09:00 and 10:00.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(
      await screen.findByRole('heading', {
        name: /availability session created/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The availability session has been created.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Dr Maya Patel')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
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

  it('adds unavailable time and shows a dedicated confirmation page', async () => {
    const createdPeriod: UnavailablePeriod = {
      unavailablePeriodId: 4,
      clinicianId: 1,
      startsAtUtc: '2026-08-20T11:00:00Z',
      endsAtUtc: '2026-08-20T12:00:00Z',
    }
    fetchMock
      .mockResolvedValueOnce(jsonResponse(clinicians))
      .mockResolvedValueOnce(jsonResponse(createdPeriod, 201))
    renderStaff('/staff/unavailable-periods/new')
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: /add unavailable time/i })

    await user.selectOptions(screen.getByLabelText('Clinician'), '1')
    await user.type(screen.getByLabelText('Unavailable from'), '2026-08-20T12:00')
    await user.type(screen.getByLabelText('Unavailable until'), '2026-08-20T13:00')
    await user.click(
      screen.getByRole('button', { name: /add unavailable time/i }),
    )

    expect(
      await screen.findByRole('heading', { name: /unavailable time added/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("The clinician's unavailable time has been added."),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/staff/unavailable-periods',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('loads, filters and clears bookings on the booking route', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(clinicians))
      .mockResolvedValueOnce(jsonResponse([activeBooking]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([activeBooking]))
    renderStaff('/staff/bookings')
    const user = userEvent.setup()
    await screen.findByText('1 booking found')

    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('APT-7K4M9Q2R')).toBeInTheDocument()
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
    fetchMock
      .mockResolvedValueOnce(jsonResponse(clinicians))
      .mockResolvedValueOnce(
        jsonResponse(
          { detail: 'The availability session overlaps an existing session.' },
          409,
        ),
      )
    renderStaff('/staff/availability/new')
    const user = userEvent.setup()
    await screen.findByRole('heading', {
      name: /create an availability session/i,
    })

    await user.selectOptions(screen.getByLabelText('Clinician'), '1')
    await user.type(
      screen.getByLabelText('Clinician available from'),
      '2026-08-20T09:00',
    )
    await user.type(
      screen.getByLabelText('Clinician available until'),
      '2026-08-20T10:00',
    )
    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(
      await screen.findByText(
        'The availability session overlaps an existing session.',
      ),
    ).toBeInTheDocument()
  })

  it('validates the availability time range before sending it', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(clinicians))
    renderStaff('/staff/availability/new')
    const user = userEvent.setup()
    await screen.findByRole('heading', {
      name: /create an availability session/i,
    })

    await user.selectOptions(screen.getByLabelText('Clinician'), '1')
    await user.type(
      screen.getByLabelText('Clinician available from'),
      '2026-08-20T10:00',
    )
    await user.type(
      screen.getByLabelText('Clinician available until'),
      '2026-08-20T09:00',
    )
    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(
      screen.getByText('The session end must be later than its start.'),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows a summary when required availability details are missing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(clinicians))
    renderStaff('/staff/availability/new')
    const user = userEvent.setup()
    await screen.findByRole('heading', {
      name: /create an availability session/i,
    })

    await user.click(screen.getByRole('button', { name: /create session/i }))

    expect(
      screen.getByText(
        'Select a clinician and enter the availability times and appointment length.',
      ),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns direct confirmation visits to the relevant form', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(clinicians))
    renderStaff('/staff/availability/confirmation')

    expect(
      await screen.findByRole('heading', {
        name: /create an availability session/i,
      }),
    ).toBeInTheDocument()
  })

  it('shows an error when clinician information cannot be loaded', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Clinicians are temporarily unavailable.' }, 503),
    )
    renderStaff('/staff/unavailable-periods/new')

    expect(
      await screen.findByText('Clinicians are temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add unavailable time/i }),
    ).not.toBeInTheDocument()
  })
})
