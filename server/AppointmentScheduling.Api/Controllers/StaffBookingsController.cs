using AppointmentScheduling.Api.Contracts.Bookings;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/staff/bookings")]
[Tags("Staff bookings")]
public sealed class StaffBookingsController : ControllerBase
{
    private readonly StaffBookingQueryService _staffBookingQueryService;

    public StaffBookingsController(
        StaffBookingQueryService staffBookingQueryService)
    {
        _staffBookingQueryService = staffBookingQueryService;
    }

    [HttpGet]
    [EndpointName("GetStaffBookings")]
    [EndpointSummary("List bookings for staff")]
    [EndpointDescription(
        "Returns active and cancelled bookings in appointment order. Results can be filtered by clinician, half-open UTC time range and booking status.")]
    [ProducesResponseType<IReadOnlyList<StaffBookingResponse>>(
        StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<StaffBookingResponse>>> Get(
        [FromQuery] int? clinicianId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] BookingStatus? status,
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
            return Problem(
                title: "Invalid staff booking query",
                detail: exception.Message,
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    private static StaffBookingResponse ToResponse(Booking booking)
    {
        var slot = booking.AppointmentSlot;
        var clinician = slot.AvailabilitySession.Clinician;

        return new StaffBookingResponse(
            booking.Reference,
            booking.Status.ToString(),
            booking.BookedAtUtc,
            booking.CancelledAtUtc,
            slot.AppointmentSlotId,
            slot.StartsAtUtc,
            slot.EndsAtUtc,
            clinician.ClinicianId,
            clinician.Name,
            booking.Patient.DisplayName);
    }
}
