namespace AppointmentScheduling.Api.Contracts.Availability;

public sealed record AvailabilitySessionResponse(
    int AvailabilitySessionId,
    int ClinicianId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int SlotDurationMinutes,
    IReadOnlyList<AppointmentSlotResponse> AppointmentSlots);
