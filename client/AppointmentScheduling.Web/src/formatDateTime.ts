const appointmentDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Europe/London',
})

export function formatAppointmentDateTime(value: string): string {
  return appointmentDateTimeFormatter.format(new Date(asUtc(value)))
}

function asUtc(value: string): string {
  return /(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
}
