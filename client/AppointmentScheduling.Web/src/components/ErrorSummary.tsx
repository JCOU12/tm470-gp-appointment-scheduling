interface ErrorSummaryProps {
  message: string | null
}

export function ErrorSummary({ message }: ErrorSummaryProps) {
  if (message === null) {
    return null
  }

  return (
    <div
      className="nhsuk-error-summary"
      data-module="nhsuk-error-summary"
      role="alert"
    >
      <div>
        <h2 className="nhsuk-error-summary__title">
          Please check and try again
        </h2>
        <div className="nhsuk-error-summary__body">
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
}
