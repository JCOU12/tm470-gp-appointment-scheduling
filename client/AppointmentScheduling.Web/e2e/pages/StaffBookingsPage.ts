import type { Locator, Page } from '@playwright/test'

interface BookingFilters {
  clinicianId: string
  fromDate: string
  toDate: string
  status: 'Active' | 'Cancelled'
}

export class StaffBookingsPage {
  readonly heading: Locator
  readonly page: Page
  readonly resultCount: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Review bookings' })
    this.resultCount = page.getByText(/\d+ bookings? found/)
  }

  async goto() {
    await this.page.goto('/staff/bookings')
  }

  async applyFilters(filters: BookingFilters) {
    await this.page
      .getByRole('combobox', { name: 'Clinician', exact: true })
      .selectOption(filters.clinicianId)
    await this.page.getByLabel('From date').fill(filters.fromDate)
    await this.page.getByLabel('To date').fill(filters.toDate)
    await this.page.getByLabel('Status').selectOption(filters.status)
    await this.page.getByRole('button', { name: 'Apply filters' }).click()
  }

  bookingRow(bookingReference: string) {
    return this.page
      .getByRole('row')
      .filter({ hasText: bookingReference })
  }
}
