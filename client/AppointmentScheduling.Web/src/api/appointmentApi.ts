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

interface ProblemDetails {
  title?: string
  detail?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let problem: ProblemDetails | undefined

    try {
      problem = (await response.json()) as ProblemDetails
    } catch {
      problem = undefined
    }

    throw new ApiError(
      problem?.detail ?? problem?.title ?? 'The request could not be completed.',
      response.status,
    )
  }

  return (await response.json()) as T
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
