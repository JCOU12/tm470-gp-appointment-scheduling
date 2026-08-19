import type { Booking } from '../api/appointmentApi'
import { formatAppointmentDateTime } from '../formatDateTime'

interface BookingPanelProps {
  booking: Booking
  isCancelling: boolean
  isConfirmingCancellation: boolean
  onStartCancellation: () => void
  onKeepBooking: () => void
  onConfirmCancellation: () => void
}

export function BookingPanel({
  booking,
  isCancelling,
  isConfirmingCancellation,
  onStartCancellation,
  onKeepBooking,
  onConfirmCancellation,
}: BookingPanelProps) {
  const isActive = booking.status === 'Active'

  return (
    <article
      className="nhsuk-card booking-card"
      aria-labelledby="booking-heading"
    >
      <div className="nhsuk-card__content">
        <div className="booking-card-header">
          <div>
            <span className="nhsuk-caption-m">Booking reference</span>
            <h2 className="nhsuk-card__heading" id="booking-heading">
              Booking {booking.bookingId}
            </h2>
          </div>
          <span
            className={`nhsuk-tag status-badge ${
              isActive ? 'status-active' : 'status-cancelled'
            }`}
          >
            {booking.status}
          </span>
        </div>

        <dl className="nhsuk-summary-list booking-details">
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
        </dl>

        {isActive && !isConfirmingCancellation && (
          <button
            className="nhsuk-button nhsuk-button--warning"
            type="button"
            onClick={onStartCancellation}
          >
            Cancel this booking
          </button>
        )}

        {isActive && isConfirmingCancellation && (
          <div
            className="nhsuk-warning-callout cancellation-confirmation"
            role="group"
            aria-label="Confirm cancellation"
          >
            <h3 className="nhsuk-warning-callout__label">
              <span className="nhsuk-u-visually-hidden">Important: </span>
              Are you sure you want to cancel?
            </h3>
            <p>The appointment will become available to another patient.</p>
            <div className="button-group">
              <button
                className="nhsuk-button nhsuk-button--warning"
                type="button"
                onClick={onConfirmCancellation}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling…' : 'Yes, cancel booking'}
              </button>
              <button
                className="nhsuk-button nhsuk-button--secondary"
                type="button"
                onClick={onKeepBooking}
                disabled={isCancelling}
              >
                Keep booking
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
