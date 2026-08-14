namespace AppointmentScheduling.Api.Services;

public sealed class UnavailablePeriodValidationException : Exception
{
    public UnavailablePeriodValidationException(string message)
        : base(message)
    {
    }
}
