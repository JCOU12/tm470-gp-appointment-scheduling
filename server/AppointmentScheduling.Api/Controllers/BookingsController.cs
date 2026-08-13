using AppointmentScheduling.Api.Contracts.Bookings;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/bookings")]
public sealed class BookingsController : ControllerBase
{
    private readonly BookingService _bookingService;

    public BookingsController(BookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpPost]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingResponse>> Create(
        CreateBookingRequest request,
        CancellationToken cancellationToken)
    {
        Booking booking;

        try
        {
            booking = await _bookingService.CreateAsync(
                request.AppointmentSlotId,
                request.PatientReference,
                request.PatientDisplayName,
                cancellationToken);
        }
        catch (BookingValidationException exception)
        {
            return ProblemResponse(
                "Invalid booking request",
                exception.Message,
                StatusCodes.Status400BadRequest);
        }
        catch (BookingNotFoundException exception)
        {
            return ProblemResponse(
                "Appointment slot not found",
                exception.Message,
                StatusCodes.Status404NotFound);
        }
        catch (BookingConflictException exception)
        {
            return ProblemResponse(
                "Booking conflict",
                exception.Message,
                StatusCodes.Status409Conflict);
        }

        var response = new BookingResponse(
            booking.BookingId,
            booking.AppointmentSlotId,
            booking.Patient.Reference,
            booking.Patient.DisplayName,
            booking.Status.ToString(),
            booking.BookedAtUtc,
            booking.AppointmentSlot.StartsAtUtc,
            booking.AppointmentSlot.EndsAtUtc);

        return Created($"/api/bookings/{booking.BookingId}", response);
    }

    private ObjectResult ProblemResponse(
        string title,
        string detail,
        int statusCode)
    {
        return StatusCode(
            statusCode,
            new ProblemDetails
            {
                Title = title,
                Detail = detail,
                Status = statusCode
            });
    }
}
