namespace AppointmentScheduling.Api.Contracts.Bookings;

public sealed record BookingResponse(
    int BookingId,
    int AppointmentSlotId,
    string PatientReference,
    string PatientDisplayName,
    string Status,
    DateTime BookedAtUtc,
    DateTime? CancelledAtUtc,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc);
