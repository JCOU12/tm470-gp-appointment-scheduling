import { expect, test } from './fixtures'
import {
  appointmentNamePattern,
  futureDate,
} from './support/appointmentDates'

const browserDateOffsets: Record<string, number> = {
  chromium: 16,
  firefox: 17,
  webkit: 18,
}

test.describe('browser-compatible appointment journey', () => {
  test('staff availability can be booked, reviewed and cancelled', async ({
    availabilityPage,
    bookingManagementPage,
    patientBookingPage,
    staffBookingsPage,
    staffHomePage,
  }, testInfo) => {
    const projectOffset = browserDateOffsets[testInfo.project.name]

    if (projectOffset === undefined) {
      throw new Error(
        `No browser-compatibility date offset is configured for ${testInfo.project.name}.`,
      )
    }

    const appointmentDate = futureDate(projectOffset + testInfo.retry * 10)

    await staffHomePage.goto()
    await staffHomePage.openCreateAvailability()
    await availabilityPage.createAvailability({
      clinicianId: '1',
      date: appointmentDate,
      startsAt: '09:00',
      endsAt: '09:30',
      appointmentLength: 30,
    })
    await expect(availabilityPage.confirmationHeading).toBeVisible()

    await patientBookingPage.gotoHome()
    await patientBookingPage.startBooking()
    await patientBookingPage.chooseAppointment(
      appointmentNamePattern(appointmentDate, '09:00'),
    )
    await patientBookingPage.enterPatientName('Cameron Jones')
    await patientBookingPage.confirmAppointment()
    await expect(patientBookingPage.confirmationHeading).toBeVisible()
    const bookingReference = await patientBookingPage.bookingReference()

    await staffBookingsPage.goto()
    await staffBookingsPage.applyFilters({
      clinicianId: '1',
      fromDate: appointmentDate,
      toDate: appointmentDate,
      status: 'Active',
    })
    await expect(staffBookingsPage.resultCount).toHaveText('1 booking found')
    await expect(staffBookingsPage.bookingRow(bookingReference)).toContainText(
      'Cameron Jones',
    )

    await bookingManagementPage.goto()
    await bookingManagementPage.findBooking(bookingReference)
    await expect(bookingManagementPage.detailsHeading).toBeVisible()
    await bookingManagementPage.cancelBooking()
    await expect(bookingManagementPage.cancelledHeading).toBeVisible()
    await expect(bookingManagementPage.statusAlert).toContainText(
      bookingReference,
    )
  })
})
