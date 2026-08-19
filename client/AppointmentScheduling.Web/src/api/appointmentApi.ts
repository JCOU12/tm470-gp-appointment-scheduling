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
  bookingId: number
  appointmentSlotId: number
  patientReference: string
  patientDisplayName: string
  status: 'Active' | 'Cancelled'
  bookedAtUtc: string
  cancelledAtUtc: string | null
  startsAtUtc: string
  endsAtUtc: string
}

export interface CreateBookingRequest {
  appointmentSlotId: number
  patientReference: string
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

export function getBooking(bookingId: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${bookingId}`)
}

export function cancelBooking(bookingId: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
  })
}
