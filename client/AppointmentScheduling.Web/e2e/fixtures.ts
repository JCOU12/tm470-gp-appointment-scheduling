import { test as base } from '@playwright/test'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { BookingManagementPage } from './pages/BookingManagementPage'
import { PatientBookingPage } from './pages/PatientBookingPage'
import { StaffHomePage } from './pages/StaffHomePage'
import { UnavailablePeriodPage } from './pages/UnavailablePeriodPage'

interface AppointmentPages {
  availabilityPage: AvailabilityPage
  bookingManagementPage: BookingManagementPage
  patientBookingPage: PatientBookingPage
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
  patientBookingPage: async ({ page }, provide) => {
    await provide(new PatientBookingPage(page))
  },
  staffHomePage: async ({ page }, provide) => {
    await provide(new StaffHomePage(page))
  },
  unavailablePeriodPage: async ({ page }, provide) => {
    await provide(new UnavailablePeriodPage(page))
  },
})

export { expect } from '@playwright/test'
