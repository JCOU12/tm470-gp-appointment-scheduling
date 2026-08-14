namespace AppointmentScheduling.Api.Contracts.UnavailablePeriods;

public sealed record UnavailablePeriodResponse(
    int UnavailablePeriodId,
    int ClinicianId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc);
