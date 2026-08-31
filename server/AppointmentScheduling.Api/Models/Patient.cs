namespace AppointmentScheduling.Api.Models;

public class Patient
{
    public int PatientId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public ICollection<Booking> Bookings { get; } = new List<Booking>();
}
