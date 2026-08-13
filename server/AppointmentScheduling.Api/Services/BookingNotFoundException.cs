namespace AppointmentScheduling.Api.Services;

public sealed class BookingNotFoundException : Exception
{
    public BookingNotFoundException(string message)
        : base(message)
    {
    }
}
