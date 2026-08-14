const appointmentDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Europe/London',
})

export function formatAppointmentDateTime(value: string): string {
  return appointmentDateTimeFormatter.format(new Date(value))
}
