using AppointmentScheduling.Api.Contracts.Bookings;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Tags("Patient appointments")]
public sealed class BookingsController : ControllerBase
{
    private readonly BookingService _bookingService;

    public BookingsController(BookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet("{bookingReference}")]
    [EndpointName("GetBooking")]
    [EndpointSummary("Get a booking")]
    [EndpointDescription(
        "Returns an active or cancelled booking using its public booking reference.")]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookingResponse>> GetByReference(
        string bookingReference,
        CancellationToken cancellationToken)
    {
        try
        {
            var booking = await _bookingService.GetByReferenceAsync(
                bookingReference,
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

    [HttpPost("{bookingReference}/cancel")]
    [EndpointName("CancelBooking")]
    [EndpointSummary("Cancel a booking")]
    [EndpointDescription(
        "Cancels a future active booking and releases its appointment slot. A booking that is already cancelled or has started cannot be cancelled.")]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingResponse>> Cancel(
        string bookingReference,
        CancellationToken cancellationToken)
    {
        try
        {
            var booking = await _bookingService.CancelAsync(
                bookingReference,
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
    [EndpointName("CreateBooking")]
    [EndpointSummary("Book an appointment")]
    [EndpointDescription(
        "Creates an active booking for an available appointment slot. Availability is rechecked during the transaction to prevent double booking.")]
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

        return Created($"/api/bookings/{booking.Reference}", response);
    }

    private static BookingResponse ToResponse(Booking booking)
    {
        return new BookingResponse(
            booking.Reference,
            booking.AppointmentSlotId,
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
        return Problem(
            title: title,
            detail: detail,
            statusCode: statusCode);
    }
}
