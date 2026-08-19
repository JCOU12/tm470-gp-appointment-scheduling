interface SuccessMessageProps {
  message: string | null
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (message === null) {
    return null
  }

  return (
    <div
      className="nhsuk-notification-banner nhsuk-notification-banner--success"
      data-module="nhsuk-notification-banner"
      role="alert"
      aria-labelledby="success-message-title"
      aria-atomic="true"
    >
      <div className="nhsuk-notification-banner__header">
        <h2
          className="nhsuk-notification-banner__title"
          id="success-message-title"
        >
          Success
        </h2>
      </div>
      <div className="nhsuk-notification-banner__content">
        <p className="nhsuk-notification-banner__heading">{message}</p>
      </div>
    </div>
  )
}
