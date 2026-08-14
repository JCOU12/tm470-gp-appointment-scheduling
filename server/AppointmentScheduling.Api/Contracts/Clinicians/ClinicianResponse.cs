namespace AppointmentScheduling.Api.Contracts.Clinicians;

public sealed record ClinicianResponse(
    int ClinicianId,
    string Name,
    string Role);
