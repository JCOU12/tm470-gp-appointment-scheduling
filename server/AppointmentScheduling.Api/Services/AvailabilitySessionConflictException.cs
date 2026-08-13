namespace AppointmentScheduling.Api.Services;

public sealed class AvailabilitySessionConflictException : Exception
{
    public AvailabilitySessionConflictException(string message)
        : base(message)
    {
    }
}
