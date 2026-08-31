import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router'
import { ApiError } from './api/apiClient'
import {
  createAvailabilitySession,
  createUnavailablePeriod,
  getClinicians,
  getStaffBookings,
  type AvailabilitySession,
  type Clinician,
  type StaffBooking,
  type StaffBookingFilters,
  type UnavailablePeriod,
} from './api/staffApi'
import { ErrorSummary } from './components/ErrorSummary'
import { ServiceLayout } from './components/ServiceLayout'
import { SuccessMessage } from './components/SuccessMessage'
import { focusMainContent } from './focusMainContent'
import { formatAppointmentDateTime } from './formatDateTime'
import './App.css'

interface StaffRouteState {
  availabilitySession?: AvailabilitySession
  unavailablePeriod?: UnavailablePeriod
  clinicianName?: string
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'The service could not be reached. Check your connection and try again.'
}

function localDateTimeToUtc(value: string): string {
  return new Date(value).toISOString()
}

function localDateBoundaryToUtc(value: string, followingDay = false): string {
  const boundary = new Date(`${value}T00:00`)

  if (followingDay) {
    boundary.setDate(boundary.getDate() + 1)
  }

  return boundary.toISOString()
}

function getAvailabilitySummary(
  startsAt: string,
  endsAt: string,
  appointmentLength: string,
): string | null {
  if (startsAt === '' || endsAt === '' || appointmentLength === '') {
    return null
  }

  const startsAtMilliseconds = new Date(startsAt).getTime()
  const endsAtMilliseconds = new Date(endsAt).getTime()
  const appointmentLengthMinutes = Number(appointmentLength)
  const availabilityMinutes =
    (endsAtMilliseconds - startsAtMilliseconds) / 60_000

  if (
    !Number.isFinite(availabilityMinutes) ||
    !Number.isFinite(appointmentLengthMinutes) ||
    availabilityMinutes <= 0 ||
    appointmentLengthMinutes <= 0
  ) {
    return null
  }

  if (availabilityMinutes % appointmentLengthMinutes !== 0) {
    return `The availability period cannot be divided evenly into ${appointmentLengthMinutes}-minute appointments.`
  }

  const appointmentCount = availabilityMinutes / appointmentLengthMinutes
  const appointmentLabel =
    appointmentCount === 1 ? 'appointment' : 'appointments'

  return `This will create ${appointmentCount} ${appointmentLabel} between ${startsAt.slice(11, 16)} and ${endsAt.slice(11, 16)}.`
}

function StaffRouteFocus() {
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }

    previousPathname.current = pathname
    focusMainContent()
  }, [pathname])

  return null
}

function PageIntroduction({
  caption,
  heading,
  children,
}: {
  caption: string
  heading: string
  children?: React.ReactNode
}) {
  return (
    <section
      className="intro nhsuk-u-reading-width"
      aria-labelledby="page-heading"
    >
      <span className="nhsuk-caption-l">{caption}</span>
      <h1 className="nhsuk-heading-xl" id="page-heading">
        {heading}
      </h1>
      {children}
    </section>
  )
}

function useClinicians() {
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    getClinicians()
      .then((loadedClinicians) => {
        if (isCurrent) {
          setClinicians(loadedClinicians)
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setError(errorMessage(requestError))
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return { clinicians, error, isLoading }
}

function StaffStartPage() {
  return (
    <>
      <PageIntroduction
        caption="Staff appointments"
        heading="Manage appointment scheduling"
      >
        <p className="nhsuk-body-l">
          Choose a task to manage clinician availability or review patient
          bookings.
        </p>
      </PageIntroduction>

      <div className="journey-card-grid">
        <article className="nhsuk-card nhsuk-card--clickable">
          <div className="nhsuk-card__content">
            <h2 className="nhsuk-card__heading nhsuk-heading-l">
              <Link
                className="nhsuk-card__link"
                to="/staff/availability/new"
              >
                Create availability
              </Link>
            </h2>
            <p className="nhsuk-card__description">
              Define when a clinician is available and generate appointment
              slots.
            </p>
          </div>
        </article>

        <article className="nhsuk-card nhsuk-card--clickable">
          <div className="nhsuk-card__content">
            <h2 className="nhsuk-card__heading nhsuk-heading-l">
              <Link
                className="nhsuk-card__link"
                to="/staff/unavailable-periods/new"
              >
                Add unavailable time
              </Link>
            </h2>
            <p className="nhsuk-card__description">
              Prevent appointments from being offered while a clinician is
              unavailable.
            </p>
          </div>
        </article>

        <article className="nhsuk-card nhsuk-card--clickable">
          <div className="nhsuk-card__content">
            <h2 className="nhsuk-card__heading nhsuk-heading-l">
              <Link className="nhsuk-card__link" to="/staff/bookings">
                Review bookings
              </Link>
            </h2>
            <p className="nhsuk-card__description">
              Filter patient bookings by clinician, date and status.
            </p>
          </div>
        </article>
      </div>
    </>
  )
}

function CreateAvailabilityPage() {
  const navigate = useNavigate()
  const { clinicians, error: cliniciansError, isLoading } = useClinicians()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clinicianId, setClinicianId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [slotDuration, setSlotDuration] = useState('15')

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)

    if (
      clinicianId === '' ||
      startsAt === '' ||
      endsAt === '' ||
      slotDuration === ''
    ) {
      setActionError(
        'Select a clinician and enter the availability times and appointment length.',
      )
      return
    }

    const startsAtUtc = localDateTimeToUtc(startsAt)
    const endsAtUtc = localDateTimeToUtc(endsAt)

    if (endsAtUtc <= startsAtUtc) {
      setActionError('The session end must be later than its start.')
      return
    }

    setIsSubmitting(true)

    try {
      const availabilitySession = await createAvailabilitySession({
        clinicianId: Number(clinicianId),
        startsAtUtc,
        endsAtUtc,
        slotDurationMinutes: Number(slotDuration),
      })
      const clinicianName = clinicians.find(
        (clinician) => clinician.clinicianId === Number(clinicianId),
      )?.name

      void navigate('/staff/availability/confirmation', {
        replace: true,
        state: {
          availabilitySession,
          clinicianName,
        } satisfies StaffRouteState,
      })
    } catch (requestError) {
      setActionError(errorMessage(requestError))
      setIsSubmitting(false)
    }
  }

  const formsDisabled = isLoading || clinicians.length === 0
  const availabilitySummary = getAvailabilitySummary(
    startsAt,
    endsAt,
    slotDuration,
  )

  return (
    <>
      <Link className="nhsuk-back-link" to="/staff">
        Back
      </Link>
      <PageIntroduction
        caption="Clinician availability"
        heading="Create an availability session"
      >
        <p className="nhsuk-body-l">
          Appointment slots will be generated throughout this period. Enter
          times in local time.
        </p>
      </PageIntroduction>
      <ErrorSummary message={cliniciansError ?? actionError} />

      {isLoading && <p role="status">Loading clinicians…</p>}

      {!isLoading && cliniciansError === null && (
        <form
          className="journey-form nhsuk-u-reading-width"
          onSubmit={(event) => void createSession(event)}
          noValidate
        >
          <div className="nhsuk-form-group form-group">
            <label className="nhsuk-label" htmlFor="session-clinician">
              Clinician
            </label>
            <select
              className="nhsuk-select"
              id="session-clinician"
              value={clinicianId}
              onChange={(event) => setClinicianId(event.target.value)}
              required
              disabled={formsDisabled || isSubmitting}
            >
              <option value="">Select a clinician</option>
              {clinicians.map((clinician) => (
                <option
                  key={clinician.clinicianId}
                  value={clinician.clinicianId}
                >
                  {clinician.name} — {clinician.role}
                </option>
              ))}
            </select>
          </div>

          <div className="nhsuk-form-group form-group">
            <label className="nhsuk-label" htmlFor="session-start">
              Clinician available from
            </label>
            <input
              className="nhsuk-input"
              id="session-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="nhsuk-form-group form-group">
            <label className="nhsuk-label" htmlFor="session-end">
              Clinician available until
            </label>
            <input
              className="nhsuk-input"
              id="session-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="nhsuk-form-group form-group compact-field">
            <label className="nhsuk-label" htmlFor="slot-duration">
              Length of each appointment in minutes
            </label>
            <input
              className="nhsuk-input nhsuk-input--width-4"
              id="slot-duration"
              type="number"
              min="5"
              step="5"
              value={slotDuration}
              onChange={(event) => setSlotDuration(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {availabilitySummary !== null && (
            <p
              className="nhsuk-inset-text availability-summary"
              aria-live="polite"
            >
              {availabilitySummary}
            </p>
          )}

          <button
            className="nhsuk-button"
            type="submit"
            disabled={formsDisabled || isSubmitting}
          >
            {isSubmitting ? 'Creating session…' : 'Create session'}
          </button>
        </form>
      )}
    </>
  )
}

function AvailabilityConfirmationPage() {
  const location = useLocation()
  const routeState = location.state as StaffRouteState | null
  const session = routeState?.availabilitySession

  if (session === undefined) {
    return <Navigate replace to="/staff/availability/new" />
  }

  return (
    <>
      <PageIntroduction
        caption="Clinician availability"
        heading="Availability session created"
      />
      <SuccessMessage message="The availability session has been created." />

      <dl className="nhsuk-summary-list journey-summary">
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Clinician</dt>
          <dd className="nhsuk-summary-list__value">
            {routeState?.clinicianName ?? `Clinician ${session.clinicianId}`}
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Available from</dt>
          <dd className="nhsuk-summary-list__value">
            {formatAppointmentDateTime(session.startsAtUtc)}
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Available until</dt>
          <dd className="nhsuk-summary-list__value">
            {formatAppointmentDateTime(session.endsAtUtc)}
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Appointment length</dt>
          <dd className="nhsuk-summary-list__value">
            {session.slotDurationMinutes} minutes
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Slots generated</dt>
          <dd className="nhsuk-summary-list__value">
            {session.appointmentSlots.length}
          </dd>
        </div>
      </dl>

      <div className="journey-links">
        <Link to="/staff/availability/new">Create another session</Link>
        <Link to="/staff">Return to staff appointments</Link>
      </div>
    </>
  )
}

function CreateUnavailablePeriodPage() {
  const navigate = useNavigate()
  const { clinicians, error: cliniciansError, isLoading } = useClinicians()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clinicianId, setClinicianId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  async function addUnavailablePeriod(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setActionError(null)

    if (clinicianId === '' || startsAt === '' || endsAt === '') {
      setActionError(
        'Select a clinician and enter the unavailable start and end times.',
      )
      return
    }

    const startsAtUtc = localDateTimeToUtc(startsAt)
    const endsAtUtc = localDateTimeToUtc(endsAt)

    if (endsAtUtc <= startsAtUtc) {
      setActionError('The unavailable period end must be later than its start.')
      return
    }

    setIsSubmitting(true)

    try {
      const unavailablePeriod = await createUnavailablePeriod({
        clinicianId: Number(clinicianId),
        startsAtUtc,
        endsAtUtc,
      })
      const clinicianName = clinicians.find(
        (clinician) => clinician.clinicianId === Number(clinicianId),
      )?.name

      void navigate('/staff/unavailable-periods/confirmation', {
        replace: true,
        state: {
          unavailablePeriod,
          clinicianName,
        } satisfies StaffRouteState,
      })
    } catch (requestError) {
      setActionError(errorMessage(requestError))
      setIsSubmitting(false)
    }
  }

  const formsDisabled = isLoading || clinicians.length === 0

  return (
    <>
      <Link className="nhsuk-back-link" to="/staff">
        Back
      </Link>
      <PageIntroduction
        caption="Clinician availability"
        heading="Add unavailable time"
      >
        <p className="nhsuk-body-l">
          Appointments that overlap this period will no longer be offered.
          Existing active bookings are protected.
        </p>
      </PageIntroduction>
      <ErrorSummary message={cliniciansError ?? actionError} />

      {isLoading && <p role="status">Loading clinicians…</p>}

      {!isLoading && cliniciansError === null && (
        <form
          className="journey-form nhsuk-u-reading-width"
          onSubmit={(event) => void addUnavailablePeriod(event)}
          noValidate
        >
          <div className="nhsuk-form-group form-group">
            <label className="nhsuk-label" htmlFor="period-clinician">
              Clinician
            </label>
            <select
              className="nhsuk-select"
              id="period-clinician"
              value={clinicianId}
              onChange={(event) => setClinicianId(event.target.value)}
              required
              disabled={formsDisabled || isSubmitting}
            >
              <option value="">Select a clinician</option>
              {clinicians.map((clinician) => (
                <option
                  key={clinician.clinicianId}
                  value={clinician.clinicianId}
                >
                  {clinician.name} — {clinician.role}
                </option>
              ))}
            </select>
          </div>

          <div className="nhsuk-form-group form-group">
            <label className="nhsuk-label" htmlFor="period-start">
              Unavailable from
            </label>
            <input
              className="nhsuk-input"
              id="period-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="nhsuk-form-group form-group">
            <label className="nhsuk-label" htmlFor="period-end">
              Unavailable until
            </label>
            <input
              className="nhsuk-input"
              id="period-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            className="nhsuk-button"
            type="submit"
            disabled={formsDisabled || isSubmitting}
          >
            {isSubmitting ? 'Adding unavailable time…' : 'Add unavailable time'}
          </button>
        </form>
      )}
    </>
  )
}

function UnavailablePeriodConfirmationPage() {
  const location = useLocation()
  const routeState = location.state as StaffRouteState | null
  const unavailablePeriod = routeState?.unavailablePeriod

  if (unavailablePeriod === undefined) {
    return <Navigate replace to="/staff/unavailable-periods/new" />
  }

  return (
    <>
      <PageIntroduction
        caption="Clinician availability"
        heading="Unavailable time added"
      />
      <SuccessMessage message="The clinician's unavailable time has been added." />

      <dl className="nhsuk-summary-list journey-summary">
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Clinician</dt>
          <dd className="nhsuk-summary-list__value">
            {routeState?.clinicianName ??
              `Clinician ${unavailablePeriod.clinicianId}`}
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Unavailable from</dt>
          <dd className="nhsuk-summary-list__value">
            {formatAppointmentDateTime(unavailablePeriod.startsAtUtc)}
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Unavailable until</dt>
          <dd className="nhsuk-summary-list__value">
            {formatAppointmentDateTime(unavailablePeriod.endsAtUtc)}
          </dd>
        </div>
      </dl>

      <div className="journey-links">
        <Link to="/staff/unavailable-periods/new">
          Add another unavailable period
        </Link>
        <Link to="/staff">Return to staff appointments</Link>
      </div>
    </>
  )
}

function StaffBookingsPage() {
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [bookings, setBookings] = useState<StaffBooking[]>([])
  const [initialError, setInitialError] = useState<string | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [clinicianId, setClinicianId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('')

  const loadBookings = useCallback(
    async (filters: StaffBookingFilters = {}) => {
      setIsLoadingBookings(true)
      setBookingsError(null)

      try {
        setBookings(await getStaffBookings(filters))
      } catch (requestError) {
        setBookings([])
        setBookingsError(errorMessage(requestError))
      } finally {
        setIsLoadingBookings(false)
      }
    },
    [],
  )

  useEffect(() => {
    let isCurrent = true

    Promise.all([getClinicians(), getStaffBookings()])
      .then(([loadedClinicians, loadedBookings]) => {
        if (isCurrent) {
          setClinicians(loadedClinicians)
          setBookings(loadedBookings)
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setInitialError(errorMessage(requestError))
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  async function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const filters: StaffBookingFilters = {}

    if (clinicianId !== '') {
      filters.clinicianId = Number(clinicianId)
    }
    if (fromDate !== '') {
      filters.fromUtc = localDateBoundaryToUtc(fromDate)
    }
    if (toDate !== '') {
      filters.toUtc = localDateBoundaryToUtc(toDate, true)
    }
    if (status === 'Active' || status === 'Cancelled') {
      filters.status = status
    }

    await loadBookings(filters)
  }

  async function clearFilters() {
    setClinicianId('')
    setFromDate('')
    setToDate('')
    setStatus('')
    await loadBookings()
  }

  return (
    <>
      <Link className="nhsuk-back-link" to="/staff">
        Back
      </Link>
      <PageIntroduction caption="Staff appointments" heading="Review bookings">
        <p className="nhsuk-body-l">
          Filter bookings by clinician, appointment date and status.
        </p>
      </PageIntroduction>
      <ErrorSummary message={initialError} />

      {isLoading && <p role="status">Loading bookings…</p>}

      {!isLoading && initialError === null && (
        <section
          className="nhsuk-card panel staff-bookings-panel"
          aria-labelledby="booking-filters-heading"
        >
          <div className="nhsuk-card__content">
            <div className="section-heading">
              <h2
                className="nhsuk-card__heading"
                id="booking-filters-heading"
              >
                Filter bookings
              </h2>
              <button
                className="nhsuk-button nhsuk-button--secondary refresh-button"
                type="button"
                onClick={() => void clearFilters()}
                disabled={isLoadingBookings}
              >
                Clear filters
              </button>
            </div>

            <form
              className="booking-filters"
              onSubmit={(event) => void applyFilters(event)}
            >
              <div className="nhsuk-form-group form-group">
                <label className="nhsuk-label" htmlFor="filter-clinician">
                  Clinician
                </label>
                <select
                  className="nhsuk-select"
                  id="filter-clinician"
                  value={clinicianId}
                  onChange={(event) => setClinicianId(event.target.value)}
                >
                  <option value="">All clinicians</option>
                  {clinicians.map((clinician) => (
                    <option
                      key={clinician.clinicianId}
                      value={clinician.clinicianId}
                    >
                      {clinician.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="nhsuk-form-group form-group">
                <label className="nhsuk-label" htmlFor="filter-from-date">
                  From date
                </label>
                <input
                  className="nhsuk-input"
                  id="filter-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>

              <div className="nhsuk-form-group form-group">
                <label className="nhsuk-label" htmlFor="filter-to-date">
                  To date
                </label>
                <input
                  className="nhsuk-input"
                  id="filter-to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>

              <div className="nhsuk-form-group form-group">
                <label className="nhsuk-label" htmlFor="filter-status">
                  Status
                </label>
                <select
                  className="nhsuk-select"
                  id="filter-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <button
                className="nhsuk-button nhsuk-button--secondary filter-button"
                type="submit"
                disabled={isLoadingBookings}
              >
                {isLoadingBookings ? 'Loading bookings…' : 'Apply filters'}
              </button>
            </form>

            {bookingsError !== null && (
              <div className="nhsuk-error-summary inline-error" role="alert">
                <p>{bookingsError}</p>
              </div>
            )}

            {!isLoadingBookings && bookingsError === null && (
              <div className="staff-booking-results" aria-live="polite">
                <p className="result-count">
                  {bookings.length === 1
                    ? '1 booking found'
                    : `${bookings.length} bookings found`}
                </p>

                {bookings.length === 0 ? (
                  <p className="empty-message">
                    No bookings match these filters.
                  </p>
                ) : (
                  <div className="table-container">
                    <table className="nhsuk-table">
                      <caption className="nhsuk-u-visually-hidden">
                        Patient bookings
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Booking</th>
                          <th scope="col">Patient</th>
                          <th scope="col">Clinician</th>
                          <th scope="col">Appointment</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => (
                          <tr key={booking.bookingReference}>
                            <td>{booking.bookingReference}</td>
                            <td>
                              <strong>{booking.patientDisplayName}</strong>
                            </td>
                            <td>{booking.clinicianName}</td>
                            <td>
                              {formatAppointmentDateTime(booking.startsAtUtc)}
                            </td>
                            <td>
                              <span
                                className={`nhsuk-tag status-badge status-${booking.status.toLowerCase()}`}
                              >
                                {booking.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}

export default function StaffApp() {
  return (
    <ServiceLayout activeArea="staff">
      <div className="staff-journey">
        <StaffRouteFocus />
        <Routes>
          <Route index element={<StaffStartPage />} />
          <Route path="availability/new" element={<CreateAvailabilityPage />} />
          <Route
            path="availability/confirmation"
            element={<AvailabilityConfirmationPage />}
          />
          <Route
            path="unavailable-periods/new"
            element={<CreateUnavailablePeriodPage />}
          />
          <Route
            path="unavailable-periods/confirmation"
            element={<UnavailablePeriodConfirmationPage />}
          />
          <Route path="bookings" element={<StaffBookingsPage />} />
          <Route path="*" element={<Navigate replace to="/staff" />} />
        </Routes>
      </div>
    </ServiceLayout>
  )
}
