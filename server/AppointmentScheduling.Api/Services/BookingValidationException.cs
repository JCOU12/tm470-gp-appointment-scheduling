namespace AppointmentScheduling.Api.Services;

public sealed class BookingValidationException : Exception
{
    public BookingValidationException(string message)
        : base(message)
    {
    }
}
