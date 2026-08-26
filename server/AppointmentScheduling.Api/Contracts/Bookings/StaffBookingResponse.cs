namespace AppointmentScheduling.Api.Contracts.Bookings;

public sealed record StaffBookingResponse(
    string BookingReference,
    string Status,
    DateTime BookedAtUtc,
    DateTime? CancelledAtUtc,
    int AppointmentSlotId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int ClinicianId,
    string ClinicianName,
    string PatientDisplayName);
