import type { Locator, Page } from '@playwright/test'

export class PatientBookingPage {
  readonly bookAppointmentLink: Locator
  readonly cancelBookingButton: Locator
  readonly confirmationAlert: Locator
  readonly confirmationHeading: Locator
  readonly confirmAppointmentButton: Locator
  readonly continueButton: Locator
  readonly detailsHeading: Locator
  readonly mainContent: Locator
  readonly page: Page
  readonly patientNameInput: Locator
  readonly patientTaskCards: Locator
  readonly reviewHeading: Locator
  readonly selectionHeading: Locator
  readonly skipLink: Locator

  constructor(page: Page) {
    this.page = page
    this.bookAppointmentLink = page.getByRole('link', {
      name: 'Book an appointment',
    })
    this.cancelBookingButton = page.getByRole('button', {
      name: 'Cancel this booking',
    })
    this.confirmationAlert = page.getByRole('alert')
    this.confirmationHeading = page.getByRole('heading', {
      name: 'Appointment confirmed',
    })
    this.confirmAppointmentButton = page.getByRole('button', {
      name: 'Confirm appointment',
    })
    this.continueButton = page.getByRole('button', { name: 'Continue' })
    this.detailsHeading = page.getByRole('heading', {
      name: 'Enter patient details',
    })
    this.mainContent = page.getByRole('main')
    this.patientNameInput = page.getByLabel('Patient name')
    this.patientTaskCards = page.locator('.journey-card-grid .nhsuk-card')
    this.reviewHeading = page.getByRole('heading', {
      name: 'Check your appointment details',
    })
    this.selectionHeading = page.getByRole('heading', {
      name: 'Choose an appointment',
    })
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' })
  }

  async gotoHome() {
    await this.page.goto('/')
  }

  async gotoAppointments() {
    await this.page.goto('/appointments')
  }

  async startBooking() {
    await this.bookAppointmentLink.click()
  }

  async chooseAppointment(accessibleName: RegExp) {
    await this.appointment(accessibleName).check()
    await this.continueButton.click()
  }

  async enterPatientName(patientName: string) {
    await this.patientNameInput.fill(patientName)
    await this.continueButton.click()
  }

  async confirmAppointment() {
    await this.confirmAppointmentButton.click()
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

  appointment(accessibleName: RegExp) {
    return this.page.getByRole('radio', { name: accessibleName })
  }

  appointmentOption(accessibleName: RegExp) {
    return this.page.locator('label.slot-option').filter({
      has: this.appointment(accessibleName),
    })
  }
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
