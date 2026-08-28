import { expect, test } from './fixtures'
import {
  appointmentNamePatternFromUtc,
  futureDate,
} from './support/appointmentDates'

test.describe('staff booking journeys', () => {
  test('a patient booking appears in the filtered staff view', async ({
    patientBookingPage,
    schedulingApi,
    staffBookingsPage,
  }, testInfo) => {
    const appointmentDate = futureDate(11 + testInfo.retry * 10)
    const availability = await schedulingApi.createAvailability({
      clinicianId: 1,
      date: appointmentDate,
      startsAt: '11:00',
      endsAt: '11:30',
      appointmentLength: 30,
    })
    const appointmentName = appointmentNamePatternFromUtc(
      availability.appointmentSlots[0].startsAtUtc,
    )

    await patientBookingPage.gotoAppointments()
    await patientBookingPage.chooseAppointment(appointmentName)
    await patientBookingPage.enterPatientName('Jamie Taylor')
    await patientBookingPage.confirmAppointment()
    await expect(patientBookingPage.confirmationHeading).toBeVisible()
    const bookingReference = await patientBookingPage.bookingReference()

    await staffBookingsPage.goto()
    await expect(staffBookingsPage.heading).toBeVisible()
    await staffBookingsPage.applyFilters({
      clinicianId: '1',
      fromDate: appointmentDate,
      toDate: appointmentDate,
      status: 'Active',
    })

    await expect(staffBookingsPage.resultCount).toHaveText('1 booking found')
    const bookingRow = staffBookingsPage.bookingRow(bookingReference)
    await expect(bookingRow).toContainText('Jamie Taylor')
    await expect(bookingRow).toContainText('Dr Maya Patel')
    await expect(bookingRow).toContainText('Active')
  })
})
