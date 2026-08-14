namespace AppointmentScheduling.Api.Services;

public sealed class UnavailablePeriodConflictException : Exception
{
    public UnavailablePeriodConflictException(string message)
        : base(message)
    {
    }
}
