namespace AppointmentScheduling.Api.Contracts.Availability;

public sealed record CreateAvailabilitySessionRequest(
    int ClinicianId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int SlotDurationMinutes);
