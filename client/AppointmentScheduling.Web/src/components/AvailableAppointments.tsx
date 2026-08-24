import type { AvailableAppointmentSlot } from '../api/appointmentApi'
import { formatAppointmentDateTime } from '../formatDateTime'

interface AvailableAppointmentsProps {
  slots: AvailableAppointmentSlot[]
  selectedSlotId: number | null
  isLoading: boolean
  error: string | null
  disabled: boolean
  onSelect: (slotId: number) => void
  onRetry: () => void
}

export function AvailableAppointments({
  slots,
  selectedSlotId,
  isLoading,
  error,
  disabled,
  onSelect,
  onRetry,
}: AvailableAppointmentsProps) {
  return (
    <section className="nhsuk-card panel" aria-labelledby="available-heading">
      <div className="nhsuk-card__content">
        <div className="section-heading">
          <div>
            <span className="nhsuk-caption-m">Step 1</span>
            <h2
              className="nhsuk-card__heading nhsuk-heading-l"
              id="available-heading"
            >
              Choose an appointment
            </h2>
          </div>
          <button
            className="nhsuk-button nhsuk-button--secondary refresh-button"
            type="button"
            onClick={onRetry}
            disabled={isLoading || disabled}
          >
            Refresh appointments
          </button>
        </div>

        {isLoading && (
          <p className="loading-message" role="status">
            Loading available appointments…
          </p>
        )}

        {!isLoading && error !== null && (
          <div className="nhsuk-error-summary inline-error" role="alert">
            <p>{error}</p>
            <button
              className="nhsuk-button nhsuk-button--secondary"
              type="button"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && error === null && slots.length === 0 && (
          <p className="empty-message">
            There are no appointments available at the moment. Try refreshing
            the list later or use an assisted booking route.
          </p>
        )}

        {!isLoading && error === null && slots.length > 0 && (
          <fieldset className="slot-fieldset" disabled={disabled}>
            <legend className="nhsuk-u-visually-hidden">
              Available appointments
            </legend>
            <ul className="slot-list">
              {slots.map((slot) => (
                <li key={slot.appointmentSlotId}>
                  <label
                    className={`slot-option${
                      selectedSlotId === slot.appointmentSlotId
                        ? ' slot-option-selected'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="appointment-slot"
                      value={slot.appointmentSlotId}
                      checked={selectedSlotId === slot.appointmentSlotId}
                      onChange={() => onSelect(slot.appointmentSlotId)}
                    />
                    <span>
                      <strong>
                        {formatAppointmentDateTime(slot.startsAtUtc)}
                      </strong>
                      <span className="slot-clinician">
                        {slot.clinicianName}
                      </span>
                      <span className="slot-role">{slot.clinicianRole}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      </div>
    </section>
  )
}
