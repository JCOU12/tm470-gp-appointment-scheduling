import type { Locator, Page } from '@playwright/test'

export class BookingManagementPage {
  readonly cancelledHeading: Locator
  readonly detailsHeading: Locator
  readonly page: Page
  readonly statusAlert: Locator

  constructor(page: Page) {
    this.page = page
    this.cancelledHeading = page.getByRole('heading', {
      name: 'Appointment cancelled',
    })
    this.detailsHeading = page.getByRole('heading', {
      name: 'Booking details',
    })
    this.statusAlert = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto('/bookings')
  }

  async findBooking(bookingReference: string) {
    await this.page.getByLabel('Booking reference').fill(bookingReference)
    await this.page.getByRole('button', { name: 'Find booking' }).click()
  }

  referenceText(bookingReference: string) {
    return this.page.getByText(bookingReference, { exact: true })
  }

  async cancelBooking() {
    await this.page
      .getByRole('button', { name: 'Cancel this booking' })
      .click()
    await this.page
      .getByRole('button', { name: 'Yes, cancel booking' })
      .click()
  }
}
