namespace AppointmentScheduling.Api.Models;

public class AvailabilitySession
{
    public int AvailabilitySessionId { get; set; }

    public int ClinicianId { get; set; }

    public DateTime StartsAtUtc { get; set; }

    public DateTime EndsAtUtc { get; set; }

    public int SlotDurationMinutes { get; set; }

    public Clinician Clinician { get; set; } = null!;

    public ICollection<AppointmentSlot> AppointmentSlots { get; }
        = new List<AppointmentSlot>();
}
