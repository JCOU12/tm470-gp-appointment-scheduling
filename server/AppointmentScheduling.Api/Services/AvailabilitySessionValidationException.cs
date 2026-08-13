namespace AppointmentScheduling.Api.Services;

public sealed class AvailabilitySessionValidationException : Exception
{
    public AvailabilitySessionValidationException(string message)
        : base(message)
    {
    }

    public AvailabilitySessionValidationException(
        string message,
        Exception innerException)
        : base(message, innerException)
    {
    }
}
