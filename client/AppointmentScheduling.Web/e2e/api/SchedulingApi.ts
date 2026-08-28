import type { APIRequestContext } from '@playwright/test'

interface CreateAvailabilityDetails {
  clinicianId: number
  date: string
  startsAt: string
  endsAt: string
  appointmentLength: number
}

interface AppointmentSlotResponse {
  appointmentSlotId: number
  startsAtUtc: string
  endsAtUtc: string
}

export interface AvailabilitySessionResponse {
  availabilitySessionId: number
  clinicianId: number
  startsAtUtc: string
  endsAtUtc: string
  slotDurationMinutes: number
  appointmentSlots: AppointmentSlotResponse[]
}

export class SchedulingApi {
  constructor(private readonly request: APIRequestContext) {}

  async createAvailability(details: CreateAvailabilityDetails) {
    const response = await this.request.post('/api/staff/sessions', {
      data: {
        clinicianId: details.clinicianId,
        startsAtUtc: `${details.date}T${details.startsAt}:00Z`,
        endsAtUtc: `${details.date}T${details.endsAt}:00Z`,
        slotDurationMinutes: details.appointmentLength,
      },
    })

    if (!response.ok()) {
      throw new Error(
        `Could not arrange appointment availability: ${response.status()} ${await response.text()}`,
      )
    }

    return (await response.json()) as AvailabilitySessionResponse
  }
}
