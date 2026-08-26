import { request } from './apiClient'

export interface Clinician {
  clinicianId: number
  name: string
  role: string
}

export interface AppointmentSlot {
  appointmentSlotId: number
  startsAtUtc: string
  endsAtUtc: string
}

export interface AvailabilitySession {
  availabilitySessionId: number
  clinicianId: number
  startsAtUtc: string
  endsAtUtc: string
  slotDurationMinutes: number
  appointmentSlots: AppointmentSlot[]
}

export interface UnavailablePeriod {
  unavailablePeriodId: number
  clinicianId: number
  startsAtUtc: string
  endsAtUtc: string
}

export interface StaffBooking {
  bookingReference: string
  status: 'Active' | 'Cancelled'
  bookedAtUtc: string
  cancelledAtUtc: string | null
  appointmentSlotId: number
  startsAtUtc: string
  endsAtUtc: string
  clinicianId: number
  clinicianName: string
  patientDisplayName: string
}

export interface StaffBookingFilters {
  clinicianId?: number
  fromUtc?: string
  toUtc?: string
  status?: 'Active' | 'Cancelled'
}

export interface CreateAvailabilitySessionInput {
  clinicianId: number
  startsAtUtc: string
  endsAtUtc: string
  slotDurationMinutes: number
}

export interface CreateUnavailablePeriodInput {
  clinicianId: number
  startsAtUtc: string
  endsAtUtc: string
}

export function getClinicians(): Promise<Clinician[]> {
  return request<Clinician[]>('/api/clinicians')
}

export function createAvailabilitySession(
  input: CreateAvailabilitySessionInput,
): Promise<AvailabilitySession> {
  return request<AvailabilitySession>('/api/staff/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function createUnavailablePeriod(
  input: CreateUnavailablePeriodInput,
): Promise<UnavailablePeriod> {
  return request<UnavailablePeriod>('/api/staff/unavailable-periods', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getStaffBookings(
  filters: StaffBookingFilters = {},
): Promise<StaffBooking[]> {
  const query = new URLSearchParams()

  if (filters.clinicianId !== undefined) {
    query.set('clinicianId', String(filters.clinicianId))
  }
  if (filters.fromUtc !== undefined) {
    query.set('fromUtc', filters.fromUtc)
  }
  if (filters.toUtc !== undefined) {
    query.set('toUtc', filters.toUtc)
  }
  if (filters.status !== undefined) {
    query.set('status', filters.status)
  }

  const queryString = query.toString()
  return request<StaffBooking[]>(
    `/api/staff/bookings${queryString === '' ? '' : `?${queryString}`}`,
  )
}
