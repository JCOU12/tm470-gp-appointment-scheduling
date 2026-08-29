import { test as base } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { SchedulingApi } from './api/SchedulingApi'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { BookingManagementPage } from './pages/BookingManagementPage'
import { PatientBookingPage } from './pages/PatientBookingPage'
import { StaffHomePage } from './pages/StaffHomePage'
import { StaffBookingsPage } from './pages/StaffBookingsPage'
import { UnavailablePeriodPage } from './pages/UnavailablePeriodPage'

interface AppointmentPages {
  availabilityPage: AvailabilityPage
  bookingManagementPage: BookingManagementPage
  concurrentPatients: [PatientBookingPage, PatientBookingPage]
  makeAxeBuilder: () => AxeBuilder
  patientBookingPage: PatientBookingPage
  schedulingApi: SchedulingApi
  staffBookingsPage: StaffBookingsPage
  staffHomePage: StaffHomePage
  unavailablePeriodPage: UnavailablePeriodPage
}

export const test = base.extend<AppointmentPages>({
  availabilityPage: async ({ page }, provide) => {
    await provide(new AvailabilityPage(page))
  },
  bookingManagementPage: async ({ page }, provide) => {
    await provide(new BookingManagementPage(page))
  },
  concurrentPatients: async ({ baseURL, browser }, provide) => {
    if (baseURL === undefined) {
      throw new Error('Playwright requires a base URL for patient journeys.')
    }

    const firstContext = await browser.newContext({
      baseURL,
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    })
    const secondContext = await browser.newContext({
      baseURL,
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    })

    try {
      await provide([
        new PatientBookingPage(await firstContext.newPage()),
        new PatientBookingPage(await secondContext.newPage()),
      ])
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()])
    }
  },
  makeAxeBuilder: async ({ page }, provide) => {
    await provide(() =>
      new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
      ]),
    )
  },
  patientBookingPage: async ({ page }, provide) => {
    await provide(new PatientBookingPage(page))
  },
  schedulingApi: async ({ request }, provide) => {
    await provide(new SchedulingApi(request))
  },
  staffBookingsPage: async ({ page }, provide) => {
    await provide(new StaffBookingsPage(page))
  },
  staffHomePage: async ({ page }, provide) => {
    await provide(new StaffHomePage(page))
  },
  unavailablePeriodPage: async ({ page }, provide) => {
    await provide(new UnavailablePeriodPage(page))
  },
})

export { expect } from '@playwright/test'
