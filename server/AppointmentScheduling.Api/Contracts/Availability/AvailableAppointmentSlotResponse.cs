namespace AppointmentScheduling.Api.Contracts.Availability;

public sealed record AvailableAppointmentSlotResponse(
    int AppointmentSlotId,
    int AvailabilitySessionId,
    int ClinicianId,
    string ClinicianName,
    string ClinicianRole,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc);
