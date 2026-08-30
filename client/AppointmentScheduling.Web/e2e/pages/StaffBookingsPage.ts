import type { Locator, Page } from '@playwright/test'

interface BookingFilters {
  clinicianId: string
  fromDate: string
  toDate: string
  status: 'Active' | 'Cancelled'
}

export class StaffBookingsPage {
  readonly applyFiltersButton: Locator
  readonly clinicianFilter: Locator
  readonly fromDateFilter: Locator
  readonly heading: Locator
  readonly page: Page
  readonly resultCount: Locator
  readonly statusFilter: Locator
  readonly tableContainer: Locator
  readonly toDateFilter: Locator

  constructor(page: Page) {
    this.page = page
    this.applyFiltersButton = page.getByRole('button', {
      name: 'Apply filters',
    })
    this.clinicianFilter = page.getByRole('combobox', {
      name: 'Clinician',
      exact: true,
    })
    this.fromDateFilter = page.getByLabel('From date')
    this.heading = page.getByRole('heading', { name: 'Review bookings' })
    this.resultCount = page.getByText(/\d+ bookings? found/)
    this.statusFilter = page.getByLabel('Status')
    this.tableContainer = page.locator('.table-container')
    this.toDateFilter = page.getByLabel('To date')
  }

  async goto() {
    await this.page.goto('/staff/bookings')
  }

  async applyFilters(filters: BookingFilters) {
    await this.clinicianFilter.selectOption(filters.clinicianId)
    await this.fromDateFilter.fill(filters.fromDate)
    await this.toDateFilter.fill(filters.toDate)
    await this.statusFilter.selectOption(filters.status)
    await this.applyFiltersButton.click()
  }

  bookingRow(bookingReference: string) {
    return this.page
      .getByRole('row')
      .filter({ hasText: bookingReference })
  }
}
