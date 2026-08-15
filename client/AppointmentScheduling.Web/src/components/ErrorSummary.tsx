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
      className="error-summary"
      ref={errorReference}
      role="alert"
      tabIndex={-1}
    >
      <h2>There is a problem</h2>
      <p>{message}</p>
    </div>
  )
}
