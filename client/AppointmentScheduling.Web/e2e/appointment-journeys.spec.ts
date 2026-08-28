import { expect, test } from './fixtures'
import {
  appointmentNamePattern,
  formattedDate,
  futureDate,
} from './support/appointmentDates'

test.describe('appointment scheduling journeys', () => {
  test('staff availability can be booked, retrieved and cancelled by a patient', async ({
    availabilityPage,
    bookingManagementPage,
    patientBookingPage,
    staffHomePage,
  }, testInfo) => {
    const appointmentDate = futureDate(7 + testInfo.retry * 10)

    await staffHomePage.goto()
    await expect(staffHomePage.heading).toBeVisible()
    await staffHomePage.openCreateAvailability()
    await expect(staffHomePage.mainContent).toBeFocused()

    await availabilityPage.fillAvailability({
      clinicianId: '1',
      date: appointmentDate,
      startsAt: '09:00',
      endsAt: '10:00',
      appointmentLength: 30,
    })
    await expect(availabilityPage.appointmentCountSummary).toContainText(
      'This will create 2 appointments',
    )
    await availabilityPage.submit()
    await expect(availabilityPage.confirmationHeading).toBeVisible()

    await patientBookingPage.gotoHome()
    await patientBookingPage.startBooking()
    await patientBookingPage.chooseAppointment(
      appointmentNamePattern(appointmentDate, '09:00'),
    )
    await patientBookingPage.enterPatientName('Alex Morgan')
    await expect(patientBookingPage.reviewHeading).toBeVisible()
    await patientBookingPage.confirmAppointment()

    await expect(patientBookingPage.confirmationAlert).toContainText(
      'has been confirmed',
    )
    const bookingReference = await patientBookingPage.bookingReference()
    expect(bookingReference).toMatch(/^APT-[A-Z0-9]{8}$/)

    await bookingManagementPage.goto()
    await bookingManagementPage.findBooking(bookingReference)
    await expect(bookingManagementPage.detailsHeading).toBeVisible()
    await expect(
      bookingManagementPage.referenceText(bookingReference),
    ).toBeVisible()
    await bookingManagementPage.cancelBooking()

    await expect(bookingManagementPage.cancelledHeading).toBeVisible()
    await expect(bookingManagementPage.statusAlert).toContainText(
      bookingReference,
    )
  })

  test('unavailable time prevents overlapping slots from being offered', async ({
    availabilityPage,
    patientBookingPage,
    unavailablePeriodPage,
  }, testInfo) => {
    const appointmentDate = futureDate(8 + testInfo.retry * 10)

    await availabilityPage.goto()
    await availabilityPage.createAvailability({
      clinicianId: '1',
      date: appointmentDate,
      startsAt: '14:00',
      endsAt: '15:00',
      appointmentLength: 30,
    })
    await expect(availabilityPage.confirmationHeading).toBeVisible()

    await unavailablePeriodPage.goto()
    await unavailablePeriodPage.addUnavailableTime({
      clinicianId: '1',
      date: appointmentDate,
      startsAt: '14:30',
      endsAt: '15:00',
    })
    await expect(unavailablePeriodPage.confirmationHeading).toBeVisible()

    await patientBookingPage.gotoAppointments()
    await expect(
      patientBookingPage.appointmentsOn(formattedDate(appointmentDate)),
    ).toHaveCount(1)
  })
})
