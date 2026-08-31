import { useState } from 'react'
import type { AvailableAppointmentSlot } from '../api/appointmentApi'
import { formatAppointmentDateTime } from '../formatDateTime'

const appointmentsPerPage = 6

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
  const [requestedPage, setRequestedPage] = useState<number | null>(null)
  const pageCount = Math.max(1, Math.ceil(slots.length / appointmentsPerPage))
  const selectedSlotIndex = slots.findIndex(
    (slot) => slot.appointmentSlotId === selectedSlotId,
  )
  const selectedSlotPage =
    selectedSlotIndex === -1
      ? 1
      : Math.floor(selectedSlotIndex / appointmentsPerPage) + 1
  const currentPage = Math.min(requestedPage ?? selectedSlotPage, pageCount)
  const firstVisibleSlot = (currentPage - 1) * appointmentsPerPage
  const visibleSlots = slots.slice(
    firstVisibleSlot,
    firstVisibleSlot + appointmentsPerPage,
  )

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
              Available appointments
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
              {visibleSlots.map((slot) => (
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

            {pageCount > 1 && (
              <nav
                className="appointment-pagination"
                aria-label="Appointment pages"
              >
                <p className="appointment-page-summary">
                  Page {currentPage} of {pageCount}
                </p>
                <ul className="appointment-page-list">
                  {currentPage > 1 && (
                    <li>
                      <button
                        className="appointment-page-link"
                        type="button"
                        onClick={() => setRequestedPage(currentPage - 1)}
                      >
                        Previous
                      </button>
                    </li>
                  )}
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                    (pageNumber) => (
                      <li key={pageNumber}>
                        <button
                          className={`appointment-page-link${
                            pageNumber === currentPage
                              ? ' appointment-page-link-current'
                              : ''
                          }`}
                          type="button"
                          aria-current={
                            pageNumber === currentPage ? 'page' : undefined
                          }
                          aria-label={`Page ${pageNumber}`}
                          onClick={() => setRequestedPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    ),
                  )}
                  {currentPage < pageCount && (
                    <li>
                      <button
                        className="appointment-page-link"
                        type="button"
                        onClick={() => setRequestedPage(currentPage + 1)}
                      >
                        Next
                      </button>
                    </li>
                  )}
                </ul>
              </nav>
            )}
          </fieldset>
        )}
      </div>
    </section>
  )
}
