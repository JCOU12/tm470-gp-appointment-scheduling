import { expect, type Locator, type Page } from '@playwright/test'

export async function expectPageToFitViewport(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth
          <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true)
}

export async function expectHorizontallyScrollable(container: Locator) {
  const canScroll = await container.evaluate((element) => {
    element.scrollLeft = element.scrollWidth
    const didScroll = element.scrollLeft > 0
    element.scrollLeft = 0
    return didScroll
  })

  expect(canScroll).toBe(true)
}

export async function expectMinimumTouchTarget(
  target: Locator,
  minimumSize = 44,
) {
  const box = await target.boundingBox()

  expect(box, 'The touch target should be visible.').not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(minimumSize)
  expect(box!.height).toBeGreaterThanOrEqual(minimumSize)
}

export async function expectVerticallyStacked(items: Locator) {
  const count = await items.count()
  const boxes = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      items.nth(index).boundingBox(),
    ),
  )

  expect(boxes.every((box) => box !== null)).toBe(true)

  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index]!.y).toBeGreaterThan(
      boxes[index - 1]!.y + boxes[index - 1]!.height,
    )
  }
}
