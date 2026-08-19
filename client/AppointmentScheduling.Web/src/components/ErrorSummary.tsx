import { useEffect, useRef } from 'react'

interface ErrorSummaryProps {
  message: string | null
}

export function ErrorSummary({ message }: ErrorSummaryProps) {
  const errorReference = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (message !== null) {
      errorReference.current?.focus()
    }
  }, [message])

  if (message === null) {
    return null
  }

  return (
    <div
      className="nhsuk-error-summary"
      data-module="nhsuk-error-summary"
      ref={errorReference}
      tabIndex={-1}
    >
      <div role="alert">
        <h2 className="nhsuk-error-summary__title">There is a problem</h2>
        <div className="nhsuk-error-summary__body">
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
}
