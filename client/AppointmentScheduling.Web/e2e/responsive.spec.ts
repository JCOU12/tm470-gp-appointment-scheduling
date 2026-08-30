import { expect, test } from './fixtures'
import {
  appointmentNamePatternFromUtc,
  futureDate,
} from './support/appointmentDates'
import {
  expectHorizontallyScrollable,
  expectMinimumTouchTarget,
  expectPageToFitViewport,
  expectVerticallyStacked,
} from './support/responsive'

test.describe('responsive appointment journeys', () => {
  test('a patient can book and safely cancel an appointment on a narrow mobile screen', async ({
    bookingManagementPage,
    page,
    patientBookingPage,
    schedulingApi,
  }, testInfo) => {
    const appointmentDate = futureDate(14 + testInfo.retry * 10)
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
    await expectVerticallyStacked(patientBookingPage.patientTaskCards)
    await expectPageToFitViewport(page)

    await patientBookingPage.startBooking()
    await expect(patientBookingPage.selectionHeading).toBeVisible()
    await expectMinimumTouchTarget(
      patientBookingPage.appointmentOption(appointmentName),
    )
    await expectMinimumTouchTarget(patientBookingPage.continueButton)
    await expectPageToFitViewport(page)

    await patientBookingPage.chooseAppointment(appointmentName)
    await patientBookingPage.enterPatientName('Robin Morgan')
    await expect(patientBookingPage.reviewHeading).toBeVisible()
    await expectMinimumTouchTarget(patientBookingPage.confirmAppointmentButton)
    await expectPageToFitViewport(page)

    await patientBookingPage.confirmAppointment()
    await expect(patientBookingPage.confirmationHeading).toBeVisible()
    const bookingReference = await patientBookingPage.bookingReference()
    await expectMinimumTouchTarget(patientBookingPage.cancelBookingButton)
    await expectPageToFitViewport(page)

    await patientBookingPage.cancelBookingButton.click()
    await expect(bookingManagementPage.confirmCancellationButton).toBeVisible()
    await expect(bookingManagementPage.keepBookingLink).toBeVisible()
    await expect(bookingManagementPage.statusAlert).not.toBeVisible()
    await expectMinimumTouchTarget(
      bookingManagementPage.confirmCancellationButton,
    )
    await expectMinimumTouchTarget(bookingManagementPage.keepBookingLink)
    await expectPageToFitViewport(page)

    await bookingManagementPage.confirmCancellationButton.click()
    await expect(bookingManagementPage.cancelledHeading).toBeVisible()
    await expect(bookingManagementPage.statusAlert).toContainText(
      bookingReference,
    )
    await expectPageToFitViewport(page)
  })

  test('staff scheduling and booking information adapt to a narrow mobile screen', async ({
    availabilityPage,
    page,
    schedulingApi,
    staffBookingsPage,
    staffHomePage,
  }, testInfo) => {
    const appointmentDate = futureDate(15 + testInfo.retry * 10)

    await staffHomePage.goto()
    await expect(staffHomePage.heading).toBeVisible()
    await expectVerticallyStacked(staffHomePage.taskCards)
    await expectPageToFitViewport(page)

    await staffHomePage.openCreateAvailability()
    await availabilityPage.createAvailability({
      clinicianId: '1',
      date: appointmentDate,
      startsAt: '10:00',
      endsAt: '11:00',
      appointmentLength: 30,
    })
    await expect(availabilityPage.confirmationHeading).toBeVisible()
    await expectPageToFitViewport(page)

    const availability = await schedulingApi.createAvailability({
      clinicianId: 2,
      date: appointmentDate,
      startsAt: '11:00',
      endsAt: '11:30',
      appointmentLength: 30,
    })
    const booking = await schedulingApi.createBooking(
      availability.appointmentSlots[0].appointmentSlotId,
      'Avery Williams',
    )

    await staffBookingsPage.goto()
    await expect(staffBookingsPage.heading).toBeVisible()
    await staffBookingsPage.applyFilters({
      clinicianId: '2',
      fromDate: appointmentDate,
      toDate: appointmentDate,
      status: 'Active',
    })
    await expect(staffBookingsPage.resultCount).toHaveText('1 booking found')
    await expect(staffBookingsPage.bookingRow(booking.bookingReference)).toBeVisible()
    await expectMinimumTouchTarget(staffBookingsPage.applyFiltersButton)
    await expectPageToFitViewport(page)

    const filterPositions = await Promise.all([
      staffBookingsPage.clinicianFilter.boundingBox(),
      staffBookingsPage.fromDateFilter.boundingBox(),
      staffBookingsPage.toDateFilter.boundingBox(),
      staffBookingsPage.statusFilter.boundingBox(),
    ])
    expect(filterPositions.every((position) => position !== null)).toBe(true)
    expect(filterPositions[1]!.y).toBeGreaterThan(filterPositions[0]!.y)
    expect(filterPositions[2]!.y).toBeGreaterThan(filterPositions[1]!.y)
    expect(filterPositions[3]!.y).toBeGreaterThan(filterPositions[2]!.y)

    await expect(staffBookingsPage.tableContainer).toHaveCSS(
      'overflow-x',
      'auto',
    )
    await expectHorizontallyScrollable(staffBookingsPage.tableContainer)
  })
})
