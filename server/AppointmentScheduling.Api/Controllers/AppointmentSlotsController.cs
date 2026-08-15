using AppointmentScheduling.Api.Contracts.Availability;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/slots")]
[Tags("Patient appointments")]
public sealed class AppointmentSlotsController : ControllerBase
{
    private readonly SchedulingService _schedulingService;

    public AppointmentSlotsController(SchedulingService schedulingService)
    {
        _schedulingService = schedulingService;
    }

    [HttpGet]
    [EndpointName("GetAvailableAppointmentSlots")]
    [EndpointSummary("List available appointment slots")]
    [EndpointDescription(
        "Returns future appointment slots for active clinicians, excluding slots that are booked or overlap an unavailable period. Optional UTC boundaries define a half-open time range.")]
    [ProducesResponseType<IReadOnlyList<AvailableAppointmentSlotResponse>>(
        StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<AvailableAppointmentSlotResponse>>>
        GetAvailableSlots(
            [FromQuery(Name = "fromUtc")] DateTime? fromUtc,
            [FromQuery(Name = "toUtc")] DateTime? toUtc,
            CancellationToken cancellationToken)
    {
        IReadOnlyList<AppointmentSlot> availableSlots;

        try
        {
            availableSlots = await _schedulingService.GetAvailableSlotsAsync(
                fromUtc,
                toUtc,
                cancellationToken);
        }
        catch (AvailableSlotsQueryValidationException exception)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Invalid available-slots query",
                    Detail = exception.Message,
                    Status = StatusCodes.Status400BadRequest
                });
        }

        var response = availableSlots
            .Select(
                slot => new AvailableAppointmentSlotResponse(
                    slot.AppointmentSlotId,
                    slot.AvailabilitySessionId,
                    slot.AvailabilitySession.ClinicianId,
                    slot.AvailabilitySession.Clinician.Name,
                    slot.AvailabilitySession.Clinician.Role,
                    slot.StartsAtUtc,
                    slot.EndsAtUtc))
            .ToList();

        return Ok(response);
    }
}
