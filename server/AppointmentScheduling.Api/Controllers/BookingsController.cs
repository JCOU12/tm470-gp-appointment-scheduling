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

    [HttpGet("{bookingId:int}")]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookingResponse>> GetById(
        int bookingId,
        CancellationToken cancellationToken)
    {
        try
        {
            var booking = await _bookingService.GetByIdAsync(
                bookingId,
                cancellationToken);

            return Ok(ToResponse(booking));
        }
        catch (BookingValidationException exception)
        {
            return ProblemResponse(
                "Invalid booking identifier",
                exception.Message,
                StatusCodes.Status400BadRequest);
        }
        catch (BookingNotFoundException exception)
        {
            return ProblemResponse(
                "Booking not found",
                exception.Message,
                StatusCodes.Status404NotFound);
        }
    }

    [HttpPost("{bookingId:int}/cancel")]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingResponse>> Cancel(
        int bookingId,
        CancellationToken cancellationToken)
    {
        try
        {
            var booking = await _bookingService.CancelAsync(
                bookingId,
                cancellationToken);

            return Ok(ToResponse(booking));
        }
        catch (BookingValidationException exception)
        {
            return ProblemResponse(
                "Invalid booking identifier",
                exception.Message,
                StatusCodes.Status400BadRequest);
        }
        catch (BookingNotFoundException exception)
        {
            return ProblemResponse(
                "Booking not found",
                exception.Message,
                StatusCodes.Status404NotFound);
        }
        catch (BookingConflictException exception)
        {
            return ProblemResponse(
                "Booking cancellation conflict",
                exception.Message,
                StatusCodes.Status409Conflict);
        }
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

        var response = ToResponse(booking);

        return Created($"/api/bookings/{booking.BookingId}", response);
    }

    private static BookingResponse ToResponse(Booking booking)
    {
        return new BookingResponse(
            booking.BookingId,
            booking.AppointmentSlotId,
            booking.Patient.Reference,
            booking.Patient.DisplayName,
            booking.Status.ToString(),
            booking.BookedAtUtc,
            booking.CancelledAtUtc,
            booking.AppointmentSlot.StartsAtUtc,
            booking.AppointmentSlot.EndsAtUtc);
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
