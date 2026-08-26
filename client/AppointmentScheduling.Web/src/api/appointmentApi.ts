import { request } from './apiClient'

export { ApiError } from './apiClient'

export interface AvailableAppointmentSlot {
  appointmentSlotId: number
  availabilitySessionId: number
  clinicianId: number
  clinicianName: string
  clinicianRole: string
  startsAtUtc: string
  endsAtUtc: string
}

export interface Booking {
  bookingReference: string
  appointmentSlotId: number
  patientDisplayName: string
  status: 'Active' | 'Cancelled'
  bookedAtUtc: string
  cancelledAtUtc: string | null
  startsAtUtc: string
  endsAtUtc: string
}

export interface CreateBookingRequest {
  appointmentSlotId: number
  patientDisplayName: string
}

export function getAvailableSlots(): Promise<AvailableAppointmentSlot[]> {
  return request<AvailableAppointmentSlot[]>('/api/slots')
}

export function createBooking(input: CreateBookingRequest): Promise<Booking> {
  return request<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getBooking(bookingReference: string): Promise<Booking> {
  return request<Booking>(
    `/api/bookings/${encodeURIComponent(bookingReference)}`,
  )
}

export function cancelBooking(bookingReference: string): Promise<Booking> {
  return request<Booking>(
    `/api/bookings/${encodeURIComponent(bookingReference)}/cancel`,
    {
      method: 'POST',
    },
  )
}
