namespace AppointmentScheduling.Api.Models;

public class UnavailablePeriod
{
    public int UnavailablePeriodId { get; set; }

    public int ClinicianId { get; set; }

    public DateTime StartsAtUtc { get; set; }

    public DateTime EndsAtUtc { get; set; }

    public Clinician Clinician { get; set; } = null!;
}
