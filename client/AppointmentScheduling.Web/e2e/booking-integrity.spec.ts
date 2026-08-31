import { expect, test } from './fixtures'
import {
  appointmentNamePatternFromUtc,
  formattedDate,
  futureDate,
} from './support/appointmentDates'

test.describe('booking integrity journeys', () => {
  test('competing patients cannot both book the same appointment', async ({
    concurrentPatients,
    schedulingApi,
  }, testInfo) => {
    const appointmentDate = futureDate(9 + testInfo.retry * 30)
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
    const [firstPatient, secondPatient] = concurrentPatients

    await Promise.all([
      firstPatient.gotoAppointments(),
      secondPatient.gotoAppointments(),
    ])
    await Promise.all([
      firstPatient.chooseAppointment(appointmentName),
      secondPatient.chooseAppointment(appointmentName),
    ])
    await Promise.all([
      firstPatient.enterPatientName('Morgan Evans'),
      secondPatient.enterPatientName('Riley Hughes'),
    ])
    await Promise.all([
      firstPatient.confirmAppointment(),
      secondPatient.confirmAppointment(),
    ])
    await Promise.all([
      firstPatient.waitForBookingOutcome(),
      secondPatient.waitForBookingOutcome(),
    ])

    const confirmedPatients = concurrentPatients.filter((patient) =>
      patient.isBookingConfirmed(),
    )
    expect(confirmedPatients).toHaveLength(1)

    const successfulPatient = confirmedPatients[0]
    const unsuccessfulPatient = concurrentPatients.find(
      (patient) => patient !== successfulPatient,
    )
    expect(unsuccessfulPatient).toBeDefined()

    await expect(successfulPatient.confirmationHeading).toBeVisible()
    await expect(unsuccessfulPatient!.selectionHeading).toBeVisible()
    await expect(unsuccessfulPatient!.confirmationAlert).toContainText(
      /already been booked|no longer available/i,
    )
    await expect(
      unsuccessfulPatient!.appointmentsOn(formattedDate(appointmentDate)),
    ).toHaveCount(0)
  })

  test('cancelling an appointment releases it for another patient', async ({
    bookingManagementPage,
    patientBookingPage,
    schedulingApi,
  }, testInfo) => {
    const appointmentDate = futureDate(10 + testInfo.retry * 30)
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

    await patientBookingPage.gotoAppointments()
    await patientBookingPage.chooseAppointment(appointmentName)
    await patientBookingPage.enterPatientName('Casey Williams')
    await patientBookingPage.confirmAppointment()
    await expect(patientBookingPage.confirmationHeading).toBeVisible()
    const cancelledReference = await patientBookingPage.bookingReference()

    await bookingManagementPage.goto()
    await bookingManagementPage.findBooking(cancelledReference)
    await bookingManagementPage.cancelBooking()
    await expect(bookingManagementPage.cancelledHeading).toBeVisible()

    await patientBookingPage.gotoAppointments()
    await patientBookingPage.chooseAppointment(appointmentName)
    await patientBookingPage.enterPatientName('Taylor Davies')
    await patientBookingPage.confirmAppointment()
    await expect(patientBookingPage.confirmationHeading).toBeVisible()

    const replacementReference = await patientBookingPage.bookingReference()
    expect(replacementReference).not.toBe(cancelledReference)
  })
})
