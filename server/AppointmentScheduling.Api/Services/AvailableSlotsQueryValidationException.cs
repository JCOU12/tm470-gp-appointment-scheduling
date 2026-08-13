namespace AppointmentScheduling.Api.Services;

public sealed class AvailableSlotsQueryValidationException : Exception
{
    public AvailableSlotsQueryValidationException(string message)
        : base(message)
    {
    }
}
