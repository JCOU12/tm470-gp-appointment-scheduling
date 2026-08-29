import { expect, test } from './fixtures'
import {
  appointmentNamePatternFromUtc,
  futureDate,
} from './support/appointmentDates'
import {
  expectNoAutomaticallyDetectableAccessibilityIssues,
  tabTo,
} from './support/accessibility'

test.describe('accessible appointment journeys', () => {
  test('a patient can book and cancel an appointment using only the keyboard', async ({
    bookingManagementPage,
    page,
    patientBookingPage,
    schedulingApi,
  }, testInfo) => {
    const appointmentDate = futureDate(12 + testInfo.retry * 10)
    const availability = await schedulingApi.createAvailability({
      clinicianId: 1,
      date: appointmentDate,
      startsAt: '09:00',
      endsAt: '09:30',
      appointmentLength: 30,
    })
    const appointmentName = appointmentNamePatternFromUtc(
      availability.appointmentSlots[0].startsAtUtc,
    )

    await patientBookingPage.gotoHome()
    await page.keyboard.press('Tab')
    await expect(patientBookingPage.skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(patientBookingPage.mainContent).toBeFocused()

    await tabTo(page, patientBookingPage.bookAppointmentLink)
    await page.keyboard.press('Enter')
    await expect(patientBookingPage.selectionHeading).toBeVisible()
    await expect(patientBookingPage.mainContent).toBeFocused()

    const appointment = patientBookingPage.appointment(appointmentName)
    await tabTo(page, appointment)
    await page.keyboard.press('Space')
    await expect(appointment).toBeChecked()
    await tabTo(page, patientBookingPage.continueButton)
    await page.keyboard.press('Enter')
    await expect(patientBookingPage.detailsHeading).toBeVisible()

    await tabTo(page, patientBookingPage.patientNameInput)
    await page.keyboard.type('Jordan Thomas')
    await tabTo(page, patientBookingPage.continueButton)
    await page.keyboard.press('Enter')
    await expect(patientBookingPage.reviewHeading).toBeVisible()

    await tabTo(page, patientBookingPage.confirmAppointmentButton)
    await page.keyboard.press('Enter')
    await expect(patientBookingPage.confirmationHeading).toBeVisible()
    const bookingReference = await patientBookingPage.bookingReference()

    await tabTo(page, patientBookingPage.cancelBookingButton)
    await page.keyboard.press('Enter')
    await tabTo(page, bookingManagementPage.confirmCancellationButton)
    await page.keyboard.press('Enter')

    await expect(bookingManagementPage.cancelledHeading).toBeVisible()
    await expect(bookingManagementPage.statusAlert).toContainText(
      bookingReference,
    )
  })

  test('patient booking pages have no automatically detectable WCAG A or AA violations', async ({
    bookingManagementPage,
    makeAxeBuilder,
    patientBookingPage,
    schedulingApi,
  }, testInfo) => {
    const appointmentDate = futureDate(13 + testInfo.retry * 10)
    const availability = await schedulingApi.createAvailability({
      clinicianId: 1,
      date: appointmentDate,
      startsAt: '10:00',
      endsAt: '10:30',
      appointmentLength: 30,
    })
    const appointmentName = appointmentNamePatternFromUtc(
      availability.appointmentSlots[0].startsAtUtc,
    )

    await patientBookingPage.gotoHome()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Patient start page',
    )

    await patientBookingPage.startBooking()
    await expect(patientBookingPage.selectionHeading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Appointment selection page',
    )

    await patientBookingPage.chooseAppointment(appointmentName)
    await expect(patientBookingPage.detailsHeading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Patient details page',
    )

    await patientBookingPage.enterPatientName('Sam Taylor')
    await expect(patientBookingPage.reviewHeading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Appointment review page',
    )

    await patientBookingPage.confirmAppointment()
    await expect(patientBookingPage.confirmationHeading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Appointment confirmation page',
    )

    await patientBookingPage.cancelBookingButton.click()
    await expect(bookingManagementPage.confirmCancellationButton).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Cancellation confirmation page',
    )
  })

  test('staff scheduling pages have no automatically detectable WCAG A or AA violations', async ({
    availabilityPage,
    makeAxeBuilder,
    staffBookingsPage,
    staffHomePage,
    unavailablePeriodPage,
  }, testInfo) => {
    await staffHomePage.goto()
    await expect(staffHomePage.heading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Staff start page',
    )

    await availabilityPage.goto()
    await expect(availabilityPage.heading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Create availability page',
    )

    await unavailablePeriodPage.goto()
    await expect(unavailablePeriodPage.heading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Add unavailable time page',
    )

    await staffBookingsPage.goto()
    await expect(staffBookingsPage.heading).toBeVisible()
    await expectNoAutomaticallyDetectableAccessibilityIssues(
      makeAxeBuilder(),
      testInfo,
      'Staff bookings page',
    )
  })
})
