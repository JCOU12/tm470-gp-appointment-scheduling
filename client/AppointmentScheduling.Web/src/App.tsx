import { useCallback, useEffect, useMemo, useState } from 'react'
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

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'The service could not be reached. Check your connection and try again.'
}

export default function App() {
  const [slots, setSlots] = useState<AvailableAppointmentSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null)
  const [patientReference, setPatientReference] = useState('')
  const [patientDisplayName, setPatientDisplayName] = useState('')
  const [bookingLookupId, setBookingLookupId] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [slotError, setSlotError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = useState(true)
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isLoadingBooking, setIsLoadingBooking] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isConfirmingCancellation, setIsConfirmingCancellation] =
    useState(false)

  const selectedSlot = useMemo(
    () =>
      slots.find((slot) => slot.appointmentSlotId === selectedSlotId) ?? null,
    [selectedSlotId, slots],
  )

  const loadSlots = useCallback(async () => {
    setIsLoadingSlots(true)
    setSlotError(null)

    try {
      setSlots(await getAvailableSlots())
    } catch (error) {
      setSlots([])
      setSlotError(errorMessage(error))
    } finally {
      setIsLoadingSlots(false)
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
          setIsLoadingSlots(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  async function handleCreateBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccessMessage(null)

    if (selectedSlotId === null) {
      setActionError('Choose an available appointment before continuing.')
      return
    }

    setIsSubmittingBooking(true)

    try {
      const createdBooking = await createBooking({
        appointmentSlotId: selectedSlotId,
        patientReference,
        patientDisplayName,
      })
      setBooking(createdBooking)
      setBookingLookupId(String(createdBooking.bookingId))
      setSelectedSlotId(null)
      setPatientReference('')
      setPatientDisplayName('')
      setIsConfirmingCancellation(false)
      setSuccessMessage(
        `Booking ${createdBooking.bookingId} has been confirmed.`,
      )
      await loadSlots()
    } catch (error) {
      setActionError(errorMessage(error))

      if (error instanceof ApiError && error.status === 409) {
        setSelectedSlotId(null)
        await loadSlots()
      }
    } finally {
      setIsSubmittingBooking(false)
    }
  }

  async function handleBookingLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccessMessage(null)
    setIsConfirmingCancellation(false)

    const parsedBookingId = Number(bookingLookupId)

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
      setActionError('Enter a valid booking reference greater than zero.')
      return
    }

    setIsLoadingBooking(true)

    try {
      const storedBooking = await getBooking(parsedBookingId)
      setBooking(storedBooking)
      setSuccessMessage(`Booking ${storedBooking.bookingId} has been loaded.`)
    } catch (error) {
      setBooking(null)
      setActionError(errorMessage(error))
    } finally {
      setIsLoadingBooking(false)
    }
  }

  async function handleCancellation() {
    if (booking === null) {
      return
    }

    setActionError(null)
    setSuccessMessage(null)
    setIsCancelling(true)

    try {
      const cancelledBooking = await cancelBooking(booking.bookingId)
      setBooking(cancelledBooking)
      setIsConfirmingCancellation(false)
      setSuccessMessage(
        `Booking ${cancelledBooking.bookingId} has been cancelled.`,
      )
      await loadSlots()
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setIsCancelling(false)
    }
  }

  const isBookingFormDisabled = isLoadingSlots || isSubmittingBooking

  return (
    <ServiceLayout activeArea="patient">
      <section
        className="intro nhsuk-u-reading-width"
        aria-labelledby="page-heading"
      >
        <span className="nhsuk-caption-l">Patient appointments</span>
        <h1 className="nhsuk-heading-xl" id="page-heading">
          Book or manage an appointment
        </h1>
        <p className="nhsuk-body-l">
          Choose an available appointment, enter your details and receive
          immediate confirmation. You can also view or cancel an existing
          booking.
        </p>
      </section>

      <SuccessMessage message={successMessage} />

      <ErrorSummary message={actionError} />

      <AvailableAppointments
        slots={slots}
        selectedSlotId={selectedSlotId}
        isLoading={isLoadingSlots}
        error={slotError}
        disabled={isSubmittingBooking}
        onSelect={(slotId) => {
          setSelectedSlotId(slotId)
          setActionError(null)
          setSuccessMessage(null)
        }}
        onRetry={() => void loadSlots()}
      />

      <section className="nhsuk-card panel" aria-labelledby="details-heading">
        <div className="nhsuk-card__content">
          <span className="nhsuk-caption-m">Step 2</span>
          <h2
            className="nhsuk-card__heading nhsuk-heading-l"
            id="details-heading"
          >
            Enter patient details
          </h2>
          <p className="nhsuk-card__description section-introduction">
            Enter your patient reference and name so that we can confirm your
            appointment.
          </p>

          {selectedSlot !== null && (
            <div
              className="nhsuk-inset-text selected-appointment"
              role="status"
            >
              <strong>Selected appointment</strong>
              <span>
                {formatAppointmentDateTime(selectedSlot.startsAtUtc)} with{' '}
                {selectedSlot.clinicianName}
              </span>
            </div>
          )}

          <form onSubmit={(event) => void handleCreateBooking(event)}>
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
                value={patientReference}
                onChange={(event) => setPatientReference(event.target.value)}
                maxLength={50}
                required
                disabled={isBookingFormDisabled}
              />
            </div>

            <div className="nhsuk-form-group form-group">
              <label className="nhsuk-label" htmlFor="patient-name">
                Patient name
              </label>
              <input
                className="nhsuk-input nhsuk-input--width-20"
                id="patient-name"
                value={patientDisplayName}
                onChange={(event) => setPatientDisplayName(event.target.value)}
                maxLength={100}
                required
                disabled={isBookingFormDisabled}
              />
            </div>

            <button
              className="nhsuk-button"
              type="submit"
              disabled={isBookingFormDisabled}
            >
              {isSubmittingBooking
                ? 'Booking appointment…'
                : 'Book appointment'}
            </button>
          </form>
        </div>
      </section>

      <section
        className="nhsuk-card panel manage-panel"
        aria-labelledby="manage-heading"
      >
        <div className="nhsuk-card__content">
          <span className="nhsuk-caption-m">Existing booking</span>
          <h2
            className="nhsuk-card__heading nhsuk-heading-l"
            id="manage-heading"
          >
            View or cancel a booking
          </h2>
          <form
            className="lookup-form"
            onSubmit={(event) => void handleBookingLookup(event)}
          >
            <div className="nhsuk-form-group form-group lookup-field">
              <label className="nhsuk-label" htmlFor="booking-reference">
                Booking reference
              </label>
              <div className="nhsuk-hint" id="booking-reference-hint">
                Enter the number shown in the booking confirmation.
              </div>
              <input
                className="nhsuk-input nhsuk-input--width-10"
                id="booking-reference"
                aria-describedby="booking-reference-hint"
                inputMode="numeric"
                pattern="[0-9]+"
                value={bookingLookupId}
                onChange={(event) => setBookingLookupId(event.target.value)}
                required
                disabled={isLoadingBooking}
              />
            </div>
            <button
              className="nhsuk-button nhsuk-button--secondary lookup-button"
              type="submit"
              disabled={isLoadingBooking}
            >
              {isLoadingBooking ? 'Finding booking…' : 'Find booking'}
            </button>
          </form>

          {booking !== null && (
            <BookingPanel
              booking={booking}
              isCancelling={isCancelling}
              isConfirmingCancellation={isConfirmingCancellation}
              onStartCancellation={() => setIsConfirmingCancellation(true)}
              onKeepBooking={() => setIsConfirmingCancellation(false)}
              onConfirmCancellation={() => void handleCancellation()}
            />
          )}
        </div>
      </section>
    </ServiceLayout>
  )
}
