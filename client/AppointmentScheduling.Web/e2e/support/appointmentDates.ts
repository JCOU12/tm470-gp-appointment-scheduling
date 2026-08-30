export function futureDate(daysAhead: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

export function formattedDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeZone: 'Europe/London',
  }).format(new Date(`${date}T12:00:00Z`))
}

export function appointmentNamePattern(date: string, time: string): RegExp {
  const dateValue = new Date(`${date}T12:00:00Z`)
  const day = dateValue.getUTCDate().toString()
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    timeZone: 'Europe/London',
  }).format(dateValue)
  const year = dateValue.getUTCFullYear().toString()
  const [hour, minute] = time.split(':')
  const displayHour = Number(hour).toString()

  return new RegExp(
    `${escapeRegularExpression(day)}\\s+${escapeRegularExpression(month)}\\s+${escapeRegularExpression(year)}.*0?${escapeRegularExpression(displayHour)}[^0-9]${escapeRegularExpression(minute)}`,
    'i',
  )
}

export function appointmentNamePatternFromUtc(value: string): RegExp {
  const formattedDateTime = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(new Date(value))

  return new RegExp(escapeRegularExpression(formattedDateTime), 'i')
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
