import { describe, expect, it } from 'vitest'
import { formatAppointmentDateTime } from './formatDateTime'

describe('formatAppointmentDateTime', () => {
  it('treats an API date without an offset as UTC', () => {
    expect(formatAppointmentDateTime('2026-08-20T08:00:00')).toBe(
      'Thursday, 20 August 2026 at 09:00',
    )
  })

  it('preserves an explicit UTC designator', () => {
    expect(formatAppointmentDateTime('2026-08-20T08:00:00Z')).toBe(
      'Thursday, 20 August 2026 at 09:00',
    )
  })
})
