namespace AppointmentScheduling.Api.Models;

public class AppointmentSlot
{
    public int AppointmentSlotId { get; set; }

    public int AvailabilitySessionId { get; set; }

    public DateTime StartsAtUtc { get; set; }

    public DateTime EndsAtUtc { get; set; }

    public AvailabilitySession AvailabilitySession { get; set; } = null!;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
