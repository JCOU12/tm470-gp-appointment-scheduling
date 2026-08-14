namespace AppointmentScheduling.Api.Contracts.Bookings;

public sealed record StaffBookingResponse(
    int BookingId,
    string Status,
    DateTime BookedAtUtc,
    DateTime? CancelledAtUtc,
    int AppointmentSlotId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int ClinicianId,
    string ClinicianName,
    string PatientReference,
    string PatientDisplayName);
