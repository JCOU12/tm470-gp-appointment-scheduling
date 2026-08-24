import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api/apiClient'
import {
  createAvailabilitySession,
  createUnavailablePeriod,
  getClinicians,
  getStaffBookings,
  type Clinician,
  type StaffBooking,
  type StaffBookingFilters,
} from './api/staffApi'
import { ErrorSummary } from './components/ErrorSummary'
import { ServiceLayout } from './components/ServiceLayout'
import { SuccessMessage } from './components/SuccessMessage'
import { formatAppointmentDateTime } from './formatDateTime'
import './App.css'

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

export default function StaffApp() {
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [bookings, setBookings] = useState<StaffBooking[]>([])
  const [initialError, setInitialError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingSession, setIsSubmittingSession] = useState(false)
  const [isSubmittingPeriod, setIsSubmittingPeriod] = useState(false)
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  const [sessionClinicianId, setSessionClinicianId] = useState('')
  const [sessionStart, setSessionStart] = useState('')
  const [sessionEnd, setSessionEnd] = useState('')
  const [slotDuration, setSlotDuration] = useState('15')

  const [periodClinicianId, setPeriodClinicianId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const [filterClinicianId, setFilterClinicianId] = useState('')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const loadBookings = useCallback(
    async (filters: StaffBookingFilters = {}) => {
      setIsLoadingBookings(true)
      setBookingsError(null)

      try {
        setBookings(await getStaffBookings(filters))
      } catch (error) {
        setBookings([])
        setBookingsError(errorMessage(error))
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
      .catch((error: unknown) => {
        if (isCurrent) {
          setInitialError(errorMessage(error))
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

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccessMessage(null)

    const startsAtUtc = localDateTimeToUtc(sessionStart)
    const endsAtUtc = localDateTimeToUtc(sessionEnd)

    if (endsAtUtc <= startsAtUtc) {
      setActionError('The session end must be later than its start.')
      return
    }

    setIsSubmittingSession(true)

    try {
      const session = await createAvailabilitySession({
        clinicianId: Number(sessionClinicianId),
        startsAtUtc,
        endsAtUtc,
        slotDurationMinutes: Number(slotDuration),
      })
      setSessionStart('')
      setSessionEnd('')
      setSuccessMessage(
        `Availability session created with ${session.appointmentSlots.length} appointment slots.`,
      )
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setIsSubmittingSession(false)
    }
  }

  async function handleCreatePeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccessMessage(null)

    const startsAtUtc = localDateTimeToUtc(periodStart)
    const endsAtUtc = localDateTimeToUtc(periodEnd)

    if (endsAtUtc <= startsAtUtc) {
      setActionError('The unavailable period end must be later than its start.')
      return
    }

    setIsSubmittingPeriod(true)

    try {
      await createUnavailablePeriod({
        clinicianId: Number(periodClinicianId),
        startsAtUtc,
        endsAtUtc,
      })
      setPeriodStart('')
      setPeriodEnd('')
      setSuccessMessage('The clinician unavailable period has been added.')
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setIsSubmittingPeriod(false)
    }
  }

  async function handleBookingFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const filters: StaffBookingFilters = {}

    if (filterClinicianId !== '') {
      filters.clinicianId = Number(filterClinicianId)
    }
    if (filterFromDate !== '') {
      filters.fromUtc = localDateBoundaryToUtc(filterFromDate)
    }
    if (filterToDate !== '') {
      filters.toUtc = localDateBoundaryToUtc(filterToDate, true)
    }
    if (filterStatus === 'Active' || filterStatus === 'Cancelled') {
      filters.status = filterStatus
    }

    await loadBookings(filters)
  }

  async function clearBookingFilters() {
    setFilterClinicianId('')
    setFilterFromDate('')
    setFilterToDate('')
    setFilterStatus('')
    await loadBookings()
  }

  const formsDisabled = isLoading || clinicians.length === 0
  const availabilitySummary = getAvailabilitySummary(
    sessionStart,
    sessionEnd,
    slotDuration,
  )

  return (
    <ServiceLayout activeArea="staff">
      <section
        className="intro nhsuk-u-reading-width"
        aria-labelledby="page-heading"
      >
        <span className="nhsuk-caption-l">Staff appointments</span>
        <h1 className="nhsuk-heading-xl" id="page-heading">
          Manage appointment scheduling
        </h1>
        <p className="nhsuk-body-l">
          Create clinician availability, block unavailable periods and review
          patient bookings from one place.
        </p>
      </section>

      <SuccessMessage message={successMessage} />

      <ErrorSummary message={initialError ?? actionError} />

      {isLoading && (
        <p className="loading-message" role="status">
          Loading staff scheduling data…
        </p>
      )}

      <div className="staff-workflow-grid">
        <section
          className="nhsuk-card panel staff-form-panel"
          aria-labelledby="session-heading"
        >
          <div className="nhsuk-card__content">
            <span className="nhsuk-caption-m">Availability</span>
            <h2 className="nhsuk-card__heading" id="session-heading">
              Create an availability session
            </h2>
            <p className="nhsuk-card__description section-introduction">
              Appointments will be generated throughout this availability
              period. Enter times in local time.
            </p>

            <form onSubmit={(event) => void handleCreateSession(event)}>
              <div className="nhsuk-form-group form-group">
                <label className="nhsuk-label" htmlFor="session-clinician">
                  Clinician
                </label>
                <select
                  className="nhsuk-select"
                  id="session-clinician"
                  value={sessionClinicianId}
                  onChange={(event) =>
                    setSessionClinicianId(event.target.value)
                  }
                  required
                  disabled={formsDisabled || isSubmittingSession}
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
                  value={sessionStart}
                  onChange={(event) => setSessionStart(event.target.value)}
                  required
                  disabled={isSubmittingSession}
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
                  value={sessionEnd}
                  onChange={(event) => setSessionEnd(event.target.value)}
                  required
                  disabled={isSubmittingSession}
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
                  disabled={isSubmittingSession}
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
                disabled={formsDisabled || isSubmittingSession}
              >
                {isSubmittingSession ? 'Creating session…' : 'Create session'}
              </button>
            </form>
          </div>
        </section>

        <section
          className="nhsuk-card panel staff-form-panel"
          aria-labelledby="period-heading"
        >
          <div className="nhsuk-card__content">
            <span className="nhsuk-caption-m">Unavailability</span>
            <h2 className="nhsuk-card__heading" id="period-heading">
              Add an unavailable period
            </h2>
            <p className="nhsuk-card__description section-introduction">
              Appointments that overlap this period will no longer be offered.
              Existing active bookings are protected.
            </p>

            <form onSubmit={(event) => void handleCreatePeriod(event)}>
              <div className="nhsuk-form-group form-group">
                <label className="nhsuk-label" htmlFor="period-clinician">
                  Clinician
                </label>
                <select
                  className="nhsuk-select"
                  id="period-clinician"
                  value={periodClinicianId}
                  onChange={(event) => setPeriodClinicianId(event.target.value)}
                  required
                  disabled={formsDisabled || isSubmittingPeriod}
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
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  required
                  disabled={isSubmittingPeriod}
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
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  required
                  disabled={isSubmittingPeriod}
                />
              </div>

              <button
                className="nhsuk-button"
                type="submit"
                disabled={formsDisabled || isSubmittingPeriod}
              >
                {isSubmittingPeriod
                  ? 'Adding period…'
                  : 'Add unavailable period'}
              </button>
            </form>
          </div>
        </section>
      </div>

      <section
        className="nhsuk-card panel staff-bookings-panel"
        aria-labelledby="bookings-heading"
      >
        <div className="nhsuk-card__content">
          <div className="section-heading">
            <div>
              <span className="nhsuk-caption-m">Bookings</span>
              <h2 className="nhsuk-card__heading" id="bookings-heading">
                Review patient bookings
              </h2>
            </div>
            <button
              className="nhsuk-button nhsuk-button--secondary refresh-button"
              type="button"
              onClick={() => void clearBookingFilters()}
              disabled={isLoadingBookings}
            >
              Clear filters
            </button>
          </div>

          <form
            className="booking-filters"
            onSubmit={(event) => void handleBookingFilters(event)}
          >
            <div className="nhsuk-form-group form-group">
              <label className="nhsuk-label" htmlFor="filter-clinician">
                Clinician
              </label>
              <select
                className="nhsuk-select"
                id="filter-clinician"
                value={filterClinicianId}
                onChange={(event) => setFilterClinicianId(event.target.value)}
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
                value={filterFromDate}
                onChange={(event) => setFilterFromDate(event.target.value)}
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
                value={filterToDate}
                onChange={(event) => setFilterToDate(event.target.value)}
              />
            </div>

            <div className="nhsuk-form-group form-group">
              <label className="nhsuk-label" htmlFor="filter-status">
                Status
              </label>
              <select
                className="nhsuk-select"
                id="filter-status"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
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

          {!isLoading &&
            initialError === null &&
            !isLoadingBookings &&
            bookingsError === null && (
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
                          <tr key={booking.bookingId}>
                            <td>{booking.bookingId}</td>
                            <td>
                              <strong>{booking.patientDisplayName}</strong>
                              <span>{booking.patientReference}</span>
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
    </ServiceLayout>
  )
}
