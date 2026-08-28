import type { Locator, Page } from '@playwright/test'

interface AvailabilityDetails {
  clinicianId: string
  date: string
  startsAt: string
  endsAt: string
  appointmentLength: number
}

export class AvailabilityPage {
  readonly appointmentCountSummary: Locator
  readonly confirmationHeading: Locator
  readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.appointmentCountSummary = page.getByText(
      /This will create \d+ appointments?/,
    )
    this.confirmationHeading = page.getByRole('heading', {
      name: 'Availability session created',
    })
  }

  async goto() {
    await this.page.goto('/staff/availability/new')
  }

  async fillAvailability(details: AvailabilityDetails) {
    await this.page
      .getByRole('combobox', { name: 'Clinician', exact: true })
      .selectOption(details.clinicianId)
    await this.page
      .getByLabel('Clinician available from')
      .fill(`${details.date}T${details.startsAt}`)
    await this.page
      .getByLabel('Clinician available until')
      .fill(`${details.date}T${details.endsAt}`)
    await this.page
      .getByLabel('Length of each appointment in minutes')
      .fill(details.appointmentLength.toString())
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create session' }).click()
  }

  async createAvailability(details: AvailabilityDetails) {
    await this.fillAvailability(details)
    await this.submit()
  }
}
