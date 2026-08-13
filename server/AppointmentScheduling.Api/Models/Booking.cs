namespace AppointmentScheduling.Api.Models;

public class Booking
{
    public int BookingId { get; set; }

    public int AppointmentSlotId { get; set; }

    public int PatientId { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Active;

    public DateTime BookedAtUtc { get; set; }

    public DateTime? CancelledAtUtc { get; set; }

    public AppointmentSlot AppointmentSlot { get; set; } = null!;

    public Patient Patient { get; set; } = null!;
}
