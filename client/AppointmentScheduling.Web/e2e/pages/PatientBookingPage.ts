import type { Locator, Page } from '@playwright/test'

export class PatientBookingPage {
  readonly confirmationAlert: Locator
  readonly confirmationHeading: Locator
  readonly page: Page
  readonly reviewHeading: Locator
  readonly selectionHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.confirmationAlert = page.getByRole('alert')
    this.confirmationHeading = page.getByRole('heading', {
      name: 'Appointment confirmed',
    })
    this.reviewHeading = page.getByRole('heading', {
      name: 'Check your appointment details',
    })
    this.selectionHeading = page.getByRole('heading', {
      name: 'Choose an appointment',
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

  async waitForBookingOutcome() {
    await this.page.waitForURL((url) =>
      url.pathname === '/appointments'
      || /^\/appointments\/confirmation\/APT-[A-Z0-9]{8}$/.test(
        url.pathname,
      ),
    )
  }

  isBookingConfirmed() {
    return /^\/appointments\/confirmation\/APT-[A-Z0-9]{8}$/.test(
      new URL(this.page.url()).pathname,
    )
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
