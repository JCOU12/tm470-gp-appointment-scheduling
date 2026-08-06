namespace AppointmentScheduling.Api.Models;

public class Clinician
{
    public int ClinicianId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}