import type { Locator, Page } from '@playwright/test'

export class StaffHomePage {
  readonly heading: Locator
  readonly mainContent: Locator
  readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', {
      name: 'Manage appointment scheduling',
    })
    this.mainContent = page.getByRole('main')
  }

  async goto() {
    await this.page.goto('/staff')
  }

  async openCreateAvailability() {
    await this.page
      .getByRole('link', { name: 'Create availability' })
      .click()
  }
}
