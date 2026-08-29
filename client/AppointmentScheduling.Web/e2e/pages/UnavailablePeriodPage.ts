import type { Locator, Page } from '@playwright/test'

interface UnavailablePeriodDetails {
  clinicianId: string
  date: string
  startsAt: string
  endsAt: string
}

export class UnavailablePeriodPage {
  readonly confirmationHeading: Locator
  readonly heading: Locator
  readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.confirmationHeading = page.getByRole('heading', {
      name: 'Unavailable time added',
    })
    this.heading = page.getByRole('heading', {
      name: 'Add unavailable time',
    })
  }

  async goto() {
    await this.page.goto('/staff/unavailable-periods/new')
  }

  async addUnavailableTime(details: UnavailablePeriodDetails) {
    await this.page
      .getByRole('combobox', { name: 'Clinician', exact: true })
      .selectOption(details.clinicianId)
    await this.page
      .getByLabel('Unavailable from')
      .fill(`${details.date}T${details.startsAt}`)
    await this.page
      .getByLabel('Unavailable until')
      .fill(`${details.date}T${details.endsAt}`)
    await this.page
      .getByRole('button', { name: 'Add unavailable time' })
      .click()
  }
}
