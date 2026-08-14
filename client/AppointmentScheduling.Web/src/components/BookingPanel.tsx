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
    <article className="booking-card" aria-labelledby="booking-heading">
      <div className="booking-card-header">
        <div>
          <span className="eyebrow">Booking reference</span>
          <h2 id="booking-heading">Booking {booking.bookingId}</h2>
        </div>
        <span
          className={`status-badge ${
            isActive ? 'status-active' : 'status-cancelled'
          }`}
        >
          {booking.status}
        </span>
      </div>

      <dl className="booking-details">
        <div>
          <dt>Patient</dt>
          <dd>{booking.patientDisplayName}</dd>
        </div>
        <div>
          <dt>Patient reference</dt>
          <dd>{booking.patientReference}</dd>
        </div>
        <div>
          <dt>Appointment</dt>
          <dd>{formatAppointmentDateTime(booking.startsAtUtc)}</dd>
        </div>
      </dl>

      {isActive && !isConfirmingCancellation && (
        <button
          className="button-danger-secondary"
          type="button"
          onClick={onStartCancellation}
        >
          Cancel this booking
        </button>
      )}

      {isActive && isConfirmingCancellation && (
        <div className="cancellation-confirmation" role="group" aria-label="Confirm cancellation">
          <h3>Are you sure you want to cancel?</h3>
          <p>The appointment will become available to another patient.</p>
          <div className="button-group">
            <button
              className="button-danger"
              type="button"
              onClick={onConfirmCancellation}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling…' : 'Yes, cancel booking'}
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={onKeepBooking}
              disabled={isCancelling}
            >
              Keep booking
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
