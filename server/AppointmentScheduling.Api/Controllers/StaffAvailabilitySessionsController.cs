using AppointmentScheduling.Api.Contracts.Availability;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/staff/sessions")]
[Tags("Staff scheduling")]
public sealed class StaffAvailabilitySessionsController : ControllerBase
{
    private readonly AvailabilitySessionService _availabilitySessionService;

    public StaffAvailabilitySessionsController(
        AvailabilitySessionService availabilitySessionService)
    {
        _availabilitySessionService = availabilitySessionService;
    }

    [HttpPost]
    [EndpointName("CreateAvailabilitySession")]
    [EndpointSummary("Create a clinician availability session")]
    [EndpointDescription(
        "Creates a UTC availability session for an active clinician and generates equal-duration appointment slots. The duration must divide the session exactly and the session must not overlap existing availability.")]
    [ProducesResponseType<AvailabilitySessionResponse>(
        StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AvailabilitySessionResponse>> Create(
        CreateAvailabilitySessionRequest request,
        CancellationToken cancellationToken)
    {
        var availabilitySession = new AvailabilitySession
        {
            ClinicianId = request.ClinicianId,
            StartsAtUtc = request.StartsAtUtc,
            EndsAtUtc = request.EndsAtUtc,
            SlotDurationMinutes = request.SlotDurationMinutes
        };

        try
        {
            await _availabilitySessionService.CreateAsync(
                availabilitySession,
                cancellationToken);
        }
        catch (AvailabilitySessionValidationException exception)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Invalid availability session",
                    Detail = exception.Message,
                    Status = StatusCodes.Status400BadRequest
                });
        }
        catch (AvailabilitySessionConflictException exception)
        {
            return Conflict(
                new ProblemDetails
                {
                    Title = "Availability session conflict",
                    Detail = exception.Message,
                    Status = StatusCodes.Status409Conflict
                });
        }

        var response = new AvailabilitySessionResponse(
            availabilitySession.AvailabilitySessionId,
            availabilitySession.ClinicianId,
            availabilitySession.StartsAtUtc,
            availabilitySession.EndsAtUtc,
            availabilitySession.SlotDurationMinutes,
            availabilitySession.AppointmentSlots
                .OrderBy(slot => slot.StartsAtUtc)
                .Select(
                    slot => new AppointmentSlotResponse(
                        slot.AppointmentSlotId,
                        slot.StartsAtUtc,
                        slot.EndsAtUtc))
                .ToList());

        return Created(
            $"/api/staff/sessions/{availabilitySession.AvailabilitySessionId}",
            response);
    }
}
