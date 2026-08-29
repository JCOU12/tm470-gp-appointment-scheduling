import type AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

export async function expectNoAutomaticallyDetectableAccessibilityIssues(
  axeBuilder: AxeBuilder,
  testInfo: TestInfo,
  pageName: string,
) {
  const results = await axeBuilder.analyze()

  await testInfo.attach(`axe-${normaliseAttachmentName(pageName)}`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  })

  expect(
    results.violations,
    `${pageName} has automatically detectable WCAG A or AA violations.`,
  ).toEqual([])
}

export async function tabTo(
  page: Page,
  target: Locator,
  maximumTabs = 20,
) {
  for (let tabCount = 0; tabCount < maximumTabs; tabCount += 1) {
    await page.keyboard.press('Tab')

    if (await target.evaluate((element) => element === document.activeElement)) {
      return
    }
  }

  throw new Error(
    `Could not reach ${await target.getAttribute('aria-label') ?? await target.textContent() ?? 'the requested control'} with the Tab key.`,
  )
}

function normaliseAttachmentName(pageName: string) {
  return pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
