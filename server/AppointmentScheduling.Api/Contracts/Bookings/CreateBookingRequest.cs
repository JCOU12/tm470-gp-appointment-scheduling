namespace AppointmentScheduling.Api.Contracts.Bookings;

public sealed record CreateBookingRequest(
    int AppointmentSlotId,
    string PatientDisplayName);
