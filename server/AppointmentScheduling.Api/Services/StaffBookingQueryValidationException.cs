namespace AppointmentScheduling.Api.Services;

public sealed class StaffBookingQueryValidationException : Exception
{
    public StaffBookingQueryValidationException(string message)
        : base(message)
    {
    }
}
