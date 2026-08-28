import type { Locator, Page } from '@playwright/test'

export class PatientBookingPage {
  readonly confirmationAlert: Locator
  readonly page: Page
  readonly reviewHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.confirmationAlert = page.getByRole('alert')
    this.reviewHeading = page.getByRole('heading', {
      name: 'Check your appointment details',
    })
  }

  async gotoHome() {
    await this.page.goto('/')
  }

  async gotoAppointments() {
    await this.page.goto('/appointments')
  }

  async startBooking() {
    await this.page.getByRole('link', { name: 'Book an appointment' }).click()
  }

  async chooseAppointment(accessibleName: RegExp) {
    await this.page.getByRole('radio', { name: accessibleName }).check()
    await this.page.getByRole('button', { name: 'Continue' }).click()
  }

  async enterPatientName(patientName: string) {
    await this.page.getByLabel('Patient name').fill(patientName)
    await this.page.getByRole('button', { name: 'Continue' }).click()
  }

  async confirmAppointment() {
    await this.page
      .getByRole('button', { name: 'Confirm appointment' })
      .click()
  }

  async bookingReference() {
    const confirmationText = await this.confirmationAlert.textContent()
    const bookingReference = confirmationText?.match(/APT-[A-Z0-9]{8}/)?.[0]

    if (!bookingReference) {
      throw new Error(
        'The appointment confirmation did not contain a booking reference.',
      )
    }

    return bookingReference
  }

  appointmentsOn(formattedDate: string) {
    return this.page.getByRole('radio', {
      name: new RegExp(escapeRegularExpression(formattedDate), 'i'),
    })
  }
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
