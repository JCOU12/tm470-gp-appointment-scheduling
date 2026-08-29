import type { Locator, Page } from '@playwright/test'

export class BookingManagementPage {
  readonly cancelBookingButton: Locator
  readonly cancelledHeading: Locator
  readonly confirmCancellationButton: Locator
  readonly detailsHeading: Locator
  readonly page: Page
  readonly statusAlert: Locator

  constructor(page: Page) {
    this.page = page
    this.cancelBookingButton = page.getByRole('button', {
      name: 'Cancel this booking',
    })
    this.cancelledHeading = page.getByRole('heading', {
      name: 'Appointment cancelled',
    })
    this.detailsHeading = page.getByRole('heading', {
      name: 'Booking details',
    })
    this.confirmCancellationButton = page.getByRole('button', {
      name: 'Yes, cancel booking',
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
    await this.cancelBookingButton.click()
    await this.confirmCancellationButton.click()
  }
}
