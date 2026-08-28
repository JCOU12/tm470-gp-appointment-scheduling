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
  const accessibleName = `${formattedDate(date)} at ${time}`
  return new RegExp(escapeRegularExpression(accessibleName), 'i')
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
