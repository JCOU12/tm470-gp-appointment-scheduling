using AppointmentScheduling.Api.Contracts.Bookings;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/staff/bookings")]
public sealed class StaffBookingsController : ControllerBase
{
    private readonly StaffBookingQueryService _staffBookingQueryService;

    public StaffBookingsController(
        StaffBookingQueryService staffBookingQueryService)
    {
        _staffBookingQueryService = staffBookingQueryService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<StaffBookingResponse>>(
        StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<StaffBookingResponse>>> Get(
        int? clinicianId,
        DateTime? fromUtc,
        DateTime? toUtc,
        BookingStatus? status,
        CancellationToken cancellationToken)
    {
        try
        {
            var bookings = await _staffBookingQueryService.GetBookingsAsync(
                clinicianId,
                fromUtc,
                toUtc,
                status,
                cancellationToken);

            return Ok(bookings.Select(ToResponse).ToList());
        }
        catch (StaffBookingQueryValidationException exception)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Invalid staff booking query",
                    Detail = exception.Message,
                    Status = StatusCodes.Status400BadRequest
                });
        }
    }

    private static StaffBookingResponse ToResponse(Booking booking)
    {
        var slot = booking.AppointmentSlot;
        var clinician = slot.AvailabilitySession.Clinician;

        return new StaffBookingResponse(
            booking.BookingId,
            booking.Status.ToString(),
            booking.BookedAtUtc,
            booking.CancelledAtUtc,
            slot.AppointmentSlotId,
            slot.StartsAtUtc,
            slot.EndsAtUtc,
            clinician.ClinicianId,
            clinician.Name,
            booking.Patient.Reference,
            booking.Patient.DisplayName);
    }
}
