namespace AppointmentScheduling.Api.Contracts.UnavailablePeriods;

public sealed record CreateUnavailablePeriodRequest(
    int ClinicianId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc);
