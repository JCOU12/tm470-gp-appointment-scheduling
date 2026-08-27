namespace AppointmentScheduling.Api.Contracts.Bookings;

public sealed record BookingResponse(
    string BookingReference,
    int AppointmentSlotId,
    string PatientDisplayName,
    string Status,
    DateTime BookedAtUtc,
    DateTime? CancelledAtUtc,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc);
