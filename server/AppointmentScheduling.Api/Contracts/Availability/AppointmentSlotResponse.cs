namespace AppointmentScheduling.Api.Contracts.Availability;

public sealed record AppointmentSlotResponse(
    int AppointmentSlotId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc);
