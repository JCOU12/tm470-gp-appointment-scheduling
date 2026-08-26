import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import {
  ApiError,
  cancelBooking,
  createBooking,
  getAvailableSlots,
  getBooking,
  type AvailableAppointmentSlot,
  type Booking,
} from './api/appointmentApi'
import { AvailableAppointments } from './components/AvailableAppointments'
import { BookingPanel } from './components/BookingPanel'
import { ErrorSummary } from './components/ErrorSummary'
import { ServiceLayout } from './components/ServiceLayout'
import { SuccessMessage } from './components/SuccessMessage'
import { formatAppointmentDateTime } from './formatDateTime'
import './App.css'

interface BookingDraft {
  selectedSlot: AvailableAppointmentSlot | null
  patientReference: string
  patientDisplayName: string
}

interface RouteState {
  booking?: Booking
  error?: string
}

const emptyDraft: BookingDraft = {
  selectedSlot: null,
  patientReference: '',
  patientDisplayName: '',
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'The service could not be reached. Check your connection and try again.'
}

function PatientRouteFocus() {
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }

    previousPathname.current = pathname
    document.getElementById('main-content')?.focus()
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

function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <dl className="nhsuk-summary-list booking-details">
      <div className="nhsuk-summary-list__row">
        <dt className="nhsuk-summary-list__key">Booking reference</dt>
        <dd className="nhsuk-summary-list__value">{booking.bookingId}</dd>
      </div>
      <div className="nhsuk-summary-list__row">
        <dt className="nhsuk-summary-list__key">Patient</dt>
        <dd className="nhsuk-summary-list__value">
          {booking.patientDisplayName}
        </dd>
      </div>
      <div className="nhsuk-summary-list__row">
        <dt className="nhsuk-summary-list__key">Patient reference</dt>
        <dd className="nhsuk-summary-list__value">
          {booking.patientReference}
        </dd>
      </div>
      <div className="nhsuk-summary-list__row">
        <dt className="nhsuk-summary-list__key">Appointment</dt>
        <dd className="nhsuk-summary-list__value">
          {formatAppointmentDateTime(booking.startsAtUtc)}
        </dd>
      </div>
      <div className="nhsuk-summary-list__row">
        <dt className="nhsuk-summary-list__key">Status</dt>
        <dd className="nhsuk-summary-list__value">{booking.status}</dd>
      </div>
    </dl>
  )
}

function PatientStartPage() {
  return (
    <>
      <PageIntroduction
        caption="Patient appointments"
        heading="Manage your appointments"
      >
        <p className="nhsuk-body-l">
          Book a new appointment or manage an existing booking.
        </p>
      </PageIntroduction>

      <div className="journey-card-grid">
        <article className="nhsuk-card nhsuk-card--clickable">
          <div className="nhsuk-card__content">
            <h2 className="nhsuk-card__heading nhsuk-heading-l">
              <Link className="nhsuk-card__link" to="/appointments">
                Book an appointment
              </Link>
            </h2>
            <p className="nhsuk-card__description">
              Choose an available appointment and receive immediate
              confirmation.
            </p>
          </div>
        </article>

        <article className="nhsuk-card nhsuk-card--clickable">
          <div className="nhsuk-card__content">
            <h2 className="nhsuk-card__heading nhsuk-heading-l">
              <Link className="nhsuk-card__link" to="/bookings">
                View or cancel a booking
              </Link>
            </h2>
            <p className="nhsuk-card__description">
              Use your booking reference to check appointment details or
              cancel.
            </p>
          </div>
        </article>
      </div>
    </>
  )
}

function AppointmentSelectionPage({
  draft,
  setDraft,
}: {
  draft: BookingDraft
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as RouteState | null
  const [slots, setSlots] = useState<AvailableAppointmentSlot[]>([])
  const [slotError, setSlotError] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(
    routeState?.error ?? null,
  )
  const [isLoading, setIsLoading] = useState(true)

  const loadSlots = useCallback(async () => {
    setIsLoading(true)
    setSlotError(null)

    try {
      setSlots(await getAvailableSlots())
    } catch (error) {
      setSlots([])
      setSlotError(errorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    getAvailableSlots()
      .then((availableSlots) => {
        if (isCurrent) {
          setSlots(availableSlots)
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setSlotError(errorMessage(error))
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

  useEffect(() => {
    if (routeState?.error !== undefined) {
      setDraft(emptyDraft)
    }
  }, [routeState?.error, setDraft])

  function continueToDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (draft.selectedSlot === null) {
      setSelectionError('Choose an available appointment before continuing.')
      return
    }

    navigate('/appointments/details')
  }

  return (
    <>
      <Link className="nhsuk-back-link" to="/">
        Back
      </Link>
      <PageIntroduction
        caption="Book an appointment"
        heading="Choose an appointment"
      />
      <ErrorSummary message={selectionError} />

      <form onSubmit={continueToDetails}>
        <AvailableAppointments
          slots={slots}
          selectedSlotId={draft.selectedSlot?.appointmentSlotId ?? null}
          isLoading={isLoading}
          error={slotError}
          disabled={false}
          onSelect={(slotId) => {
            const selectedSlot =
              slots.find((slot) => slot.appointmentSlotId === slotId) ?? null
            setDraft((current) => ({ ...current, selectedSlot }))
            setSelectionError(null)
          }}
          onRetry={() => void loadSlots()}
        />
        <button className="nhsuk-button" type="submit" disabled={isLoading}>
          Continue
        </button>
      </form>
    </>
  )
}

function PatientDetailsPage({
  draft,
  setDraft,
}: {
  draft: BookingDraft
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>
}) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  if (draft.selectedSlot === null) {
    return <Navigate replace to="/appointments" />
  }

  function continueToReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      draft.patientReference.trim().length === 0 ||
      draft.patientDisplayName.trim().length === 0
    ) {
      setFormError('Enter the patient reference and patient name.')
      return
    }

    setDraft((current) => ({
      ...current,
      patientReference: current.patientReference.trim(),
      patientDisplayName: current.patientDisplayName.trim(),
    }))
    navigate('/appointments/review')
  }

  return (
    <>
      <Link className="nhsuk-back-link" to="/appointments">
        Back
      </Link>
      <PageIntroduction
        caption="Book an appointment"
        heading="Enter patient details"
      >
        <p className="nhsuk-body-l">
          Enter the details associated with this booking.
        </p>
      </PageIntroduction>
      <ErrorSummary message={formError} />

      <div className="nhsuk-inset-text selected-appointment" role="status">
        <strong>Selected appointment</strong>
        <span>
          {formatAppointmentDateTime(draft.selectedSlot.startsAtUtc)} with{' '}
          {draft.selectedSlot.clinicianName}
        </span>
      </div>

      <form className="journey-form" onSubmit={continueToReview} noValidate>
        <div className="nhsuk-form-group form-group">
          <label className="nhsuk-label" htmlFor="patient-reference">
            Patient reference
          </label>
          <div className="nhsuk-hint" id="patient-reference-hint">
            For example, PAT-001
          </div>
          <input
            className="nhsuk-input nhsuk-input--width-20"
            id="patient-reference"
            aria-describedby="patient-reference-hint"
            value={draft.patientReference}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                patientReference: event.target.value,
              }))
            }
            maxLength={50}
          />
        </div>

        <div className="nhsuk-form-group form-group">
          <label className="nhsuk-label" htmlFor="patient-name">
            Patient name
          </label>
          <input
            className="nhsuk-input nhsuk-input--width-20"
            id="patient-name"
            value={draft.patientDisplayName}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                patientDisplayName: event.target.value,
              }))
            }
            maxLength={100}
          />
        </div>

        <button className="nhsuk-button" type="submit">
          Continue
        </button>
      </form>
    </>
  )
}

function ReviewAppointmentPage({ draft }: { draft: BookingDraft }) {
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (draft.selectedSlot === null) {
    return <Navigate replace to="/appointments" />
  }

  if (
    draft.patientReference.length === 0 ||
    draft.patientDisplayName.length === 0
  ) {
    return <Navigate replace to="/appointments/details" />
  }

  async function confirmBooking() {
    if (draft.selectedSlot === null) {
      return
    }

    setActionError(null)
    setIsSubmitting(true)

    try {
      const booking = await createBooking({
        appointmentSlotId: draft.selectedSlot.appointmentSlotId,
        patientReference: draft.patientReference,
        patientDisplayName: draft.patientDisplayName,
      })
      navigate(`/appointments/confirmation/${booking.bookingId}`, {
        replace: true,
        state: { booking } satisfies RouteState,
      })
    } catch (error) {
      const message = errorMessage(error)

      if (error instanceof ApiError && error.status === 409) {
        navigate('/appointments', {
          replace: true,
          state: { error: message } satisfies RouteState,
        })
        return
      }

      setActionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Link className="nhsuk-back-link" to="/appointments/details">
        Back
      </Link>
      <PageIntroduction
        caption="Book an appointment"
        heading="Check your appointment details"
      >
        <p className="nhsuk-body-l">
          Confirm that the appointment and patient details are correct.
        </p>
      </PageIntroduction>
      <ErrorSummary message={actionError} />

      <dl className="nhsuk-summary-list journey-summary">
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Appointment</dt>
          <dd className="nhsuk-summary-list__value">
            {formatAppointmentDateTime(draft.selectedSlot.startsAtUtc)}
            <span className="summary-secondary">
              {draft.selectedSlot.clinicianName},{' '}
              {draft.selectedSlot.clinicianRole}
            </span>
          </dd>
          <dd className="nhsuk-summary-list__actions">
            <Link to="/appointments">
              Change<span className="nhsuk-u-visually-hidden"> appointment</span>
            </Link>
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Patient reference</dt>
          <dd className="nhsuk-summary-list__value">
            {draft.patientReference}
          </dd>
          <dd className="nhsuk-summary-list__actions">
            <Link to="/appointments/details">
              Change
              <span className="nhsuk-u-visually-hidden">
                {' '}
                patient reference
              </span>
            </Link>
          </dd>
        </div>
        <div className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">Patient name</dt>
          <dd className="nhsuk-summary-list__value">
            {draft.patientDisplayName}
          </dd>
          <dd className="nhsuk-summary-list__actions">
            <Link to="/appointments/details">
              Change<span className="nhsuk-u-visually-hidden"> patient name</span>
            </Link>
          </dd>
        </div>
      </dl>

      <button
        className="nhsuk-button"
        type="button"
        disabled={isSubmitting}
        onClick={() => void confirmBooking()}
      >
        {isSubmitting ? 'Booking appointment…' : 'Confirm appointment'}
      </button>
    </>
  )
}

function useRouteBooking() {
  const { bookingId } = useParams()
  const location = useLocation()
  const routeState = location.state as RouteState | null
  const parsedBookingId = Number(bookingId)
  const stateBooking = routeState?.booking
  const matchingStateBooking =
    stateBooking?.bookingId === parsedBookingId ? stateBooking : null
  const isValidBookingId =
    Number.isInteger(parsedBookingId) && parsedBookingId > 0
  const [bookingResult, setBookingResult] = useState<{
    bookingId: number
    booking: Booking
  } | null>(null)
  const [errorResult, setErrorResult] = useState<{
    bookingId: number
    message: string
  } | null>(null)

  useEffect(() => {
    if (matchingStateBooking !== null || !isValidBookingId) {
      return
    }

    let isCurrent = true

    getBooking(parsedBookingId)
      .then((storedBooking) => {
        if (isCurrent) {
          setBookingResult({
            bookingId: parsedBookingId,
            booking: storedBooking,
          })
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setErrorResult({
            bookingId: parsedBookingId,
            message: errorMessage(requestError),
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [isValidBookingId, matchingStateBooking, parsedBookingId])

  const loadedBooking =
    bookingResult?.bookingId === parsedBookingId
      ? bookingResult.booking
      : null
  const booking = matchingStateBooking ?? loadedBooking
  const error = !isValidBookingId
    ? 'Enter a valid booking reference greater than zero.'
    : errorResult?.bookingId === parsedBookingId
      ? errorResult.message
      : null
  const isLoading = isValidBookingId && booking === null && error === null

  return { booking, error, isLoading, parsedBookingId }
}

function BookingConfirmationPage({ resetDraft }: { resetDraft: () => void }) {
  const navigate = useNavigate()
  const { booking, error, isLoading, parsedBookingId } = useRouteBooking()

  useEffect(() => {
    resetDraft()
  }, [resetDraft])

  return (
    <>
      <PageIntroduction
        caption="Booking complete"
        heading="Appointment confirmed"
      />
      <SuccessMessage
        message={
          booking === null
            ? null
            : `Booking ${booking.bookingId} has been confirmed.`
        }
      />
      <ErrorSummary message={error} />
      {isLoading && <p role="status">Loading booking…</p>}
      {booking !== null && (
        <BookingPanel
          booking={booking}
          isCancelling={false}
          isConfirmingCancellation={false}
          onStartCancellation={() =>
            navigate(`/bookings/${parsedBookingId}/cancel`, {
              state: { booking } satisfies RouteState,
            })
          }
          onKeepBooking={() => undefined}
          onConfirmCancellation={() => undefined}
        />
      )}
      <div className="journey-links">
        <Link to="/appointments">Book another appointment</Link>
        <Link to="/">Return to patient appointments</Link>
      </div>
    </>
  )
}

function BookingLookupPage() {
  const navigate = useNavigate()
  const [bookingId, setBookingId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function findBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedBookingId = Number(bookingId)

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
      setValidationError('Enter a valid booking reference greater than zero.')
      return
    }

    navigate(`/bookings/${parsedBookingId}`)
  }

  return (
    <>
      <Link className="nhsuk-back-link" to="/">
        Back
      </Link>
      <PageIntroduction
        caption="Existing booking"
        heading="Find a booking"
      >
        <p className="nhsuk-body-l">
          Enter the booking reference shown in your confirmation.
        </p>
      </PageIntroduction>
      <ErrorSummary message={validationError} />

      <form className="journey-form" onSubmit={findBooking} noValidate>
        <div className="nhsuk-form-group form-group">
          <label className="nhsuk-label" htmlFor="booking-reference">
            Booking reference
          </label>
          <input
            className="nhsuk-input nhsuk-input--width-10"
            id="booking-reference"
            inputMode="numeric"
            pattern="[0-9]+"
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
          />
        </div>
        <button className="nhsuk-button" type="submit">
          Find booking
        </button>
      </form>
    </>
  )
}

function BookingDetailsPage() {
  const navigate = useNavigate()
  const { booking, error, isLoading, parsedBookingId } = useRouteBooking()

  return (
    <>
      <Link className="nhsuk-back-link" to="/bookings">
        Back
      </Link>
      <PageIntroduction
        caption="Existing booking"
        heading="Booking details"
      />
      <ErrorSummary message={error} />
      {isLoading && <p role="status">Loading booking…</p>}
      {booking !== null && (
        <BookingPanel
          booking={booking}
          isCancelling={false}
          isConfirmingCancellation={false}
          onStartCancellation={() =>
            navigate(`/bookings/${parsedBookingId}/cancel`, {
              state: { booking } satisfies RouteState,
            })
          }
          onKeepBooking={() => undefined}
          onConfirmCancellation={() => undefined}
        />
      )}
    </>
  )
}

function CancelBookingPage() {
  const navigate = useNavigate()
  const { booking, error, isLoading, parsedBookingId } = useRouteBooking()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  async function confirmCancellation() {
    if (booking === null) {
      return
    }

    setActionError(null)
    setIsCancelling(true)

    try {
      const cancelledBooking = await cancelBooking(booking.bookingId)
      navigate(`/bookings/${booking.bookingId}/cancelled`, {
        replace: true,
        state: { booking: cancelledBooking } satisfies RouteState,
      })
    } catch (requestError) {
      setActionError(errorMessage(requestError))
      setIsCancelling(false)
    }
  }

  return (
    <>
      <Link className="nhsuk-back-link" to={`/bookings/${parsedBookingId}`}>
        Back
      </Link>
      <PageIntroduction
        caption="Cancel appointment"
        heading="Are you sure you want to cancel?"
      >
        <p className="nhsuk-body-l">
          The appointment will become available to another patient.
        </p>
      </PageIntroduction>
      <ErrorSummary message={error ?? actionError} />
      {isLoading && <p role="status">Loading booking…</p>}
      {booking !== null && (
        <>
          <BookingSummary booking={booking} />
          {booking.status === 'Active' ? (
            <div className="button-group">
              <button
                className="nhsuk-button nhsuk-button--warning"
                type="button"
                disabled={isCancelling}
                onClick={() => void confirmCancellation()}
              >
                {isCancelling ? 'Cancelling…' : 'Yes, cancel booking'}
              </button>
              <Link
                className="nhsuk-button nhsuk-button--secondary"
                to={`/bookings/${booking.bookingId}`}
                state={{ booking } satisfies RouteState}
              >
                Keep booking
              </Link>
            </div>
          ) : (
            <p>This booking has already been cancelled.</p>
          )}
        </>
      )}
    </>
  )
}

function CancellationConfirmationPage() {
  const { booking, error, isLoading } = useRouteBooking()

  return (
    <>
      <PageIntroduction
        caption="Cancellation complete"
        heading="Appointment cancelled"
      />
      <SuccessMessage
        message={
          booking === null
            ? null
            : `Booking ${booking.bookingId} has been cancelled.`
        }
      />
      <ErrorSummary message={error} />
      {isLoading && <p role="status">Loading booking…</p>}
      {booking !== null && <BookingSummary booking={booking} />}
      <div className="journey-links">
        <Link to="/appointments">Book another appointment</Link>
        <Link to="/">Return to patient appointments</Link>
      </div>
    </>
  )
}

export default function App() {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft)
  const resetDraft = useCallback(() => setDraft(emptyDraft), [])

  return (
    <ServiceLayout activeArea="patient">
      <div className="patient-journey">
        <PatientRouteFocus />
        <Routes>
          <Route index element={<PatientStartPage />} />
          <Route
            path="appointments"
            element={
              <AppointmentSelectionPage draft={draft} setDraft={setDraft} />
            }
          />
          <Route
            path="appointments/details"
            element={<PatientDetailsPage draft={draft} setDraft={setDraft} />}
          />
          <Route
            path="appointments/review"
            element={<ReviewAppointmentPage draft={draft} />}
          />
          <Route
            path="appointments/confirmation/:bookingId"
            element={<BookingConfirmationPage resetDraft={resetDraft} />}
          />
          <Route path="bookings" element={<BookingLookupPage />} />
          <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
          <Route
            path="bookings/:bookingId/cancel"
            element={<CancelBookingPage />}
          />
          <Route
            path="bookings/:bookingId/cancelled"
            element={<CancellationConfirmationPage />}
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </div>
    </ServiceLayout>
  )
}
