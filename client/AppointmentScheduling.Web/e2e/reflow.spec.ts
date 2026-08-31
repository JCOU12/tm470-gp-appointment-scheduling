import { expect, test } from './fixtures'
import { expectPageToFitViewport } from './support/responsive'

test.describe('320 pixel desktop reflow', () => {
  test('staff validation feedback does not introduce horizontal scrolling', async ({
    availabilityPage,
    page,
  }) => {
    await availabilityPage.goto()
    await expect(availabilityPage.heading).toBeVisible()

    await availabilityPage.submit()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('.nhsuk-error-summary')).toBeFocused()
    await expectPageToFitViewport(page)
  })

  test('patient validation feedback does not introduce horizontal scrolling', async ({
    bookingManagementPage,
    page,
  }) => {
    await bookingManagementPage.goto()

    await page.getByRole('button', { name: 'Find booking' }).click()

    await expect(bookingManagementPage.statusAlert).toBeVisible()
    await expect(page.locator('.nhsuk-error-summary')).toBeFocused()
    await expectPageToFitViewport(page)
  })
})
