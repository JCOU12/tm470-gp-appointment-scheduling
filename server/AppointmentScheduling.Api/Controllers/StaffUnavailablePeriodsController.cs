using AppointmentScheduling.Api.Contracts.UnavailablePeriods;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/staff/unavailable-periods")]
[Tags("Staff scheduling")]
public sealed class StaffUnavailablePeriodsController : ControllerBase
{
    private readonly UnavailablePeriodService _unavailablePeriodService;

    public StaffUnavailablePeriodsController(
        UnavailablePeriodService unavailablePeriodService)
    {
        _unavailablePeriodService = unavailablePeriodService;
    }

    [HttpPost]
    [EndpointName("CreateUnavailablePeriod")]
    [EndpointSummary("Block a clinician's time")]
    [EndpointDescription(
        "Creates a UTC period during which a clinician cannot be booked. It must not overlap another unavailable period or an active booking.")]
    [ProducesResponseType<UnavailablePeriodResponse>(
        StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UnavailablePeriodResponse>> Create(
        CreateUnavailablePeriodRequest request,
        CancellationToken cancellationToken)
    {
        var unavailablePeriod = new UnavailablePeriod
        {
            ClinicianId = request.ClinicianId,
            StartsAtUtc = request.StartsAtUtc,
            EndsAtUtc = request.EndsAtUtc
        };

        try
        {
            await _unavailablePeriodService.CreateAsync(
                unavailablePeriod,
                cancellationToken);
        }
        catch (UnavailablePeriodValidationException exception)
        {
            return ProblemResponse(
                "Invalid unavailable period",
                exception.Message,
                StatusCodes.Status400BadRequest);
        }
        catch (UnavailablePeriodConflictException exception)
        {
            return ProblemResponse(
                "Unavailable period conflict",
                exception.Message,
                StatusCodes.Status409Conflict);
        }

        var response = new UnavailablePeriodResponse(
            unavailablePeriod.UnavailablePeriodId,
            unavailablePeriod.ClinicianId,
            unavailablePeriod.StartsAtUtc,
            unavailablePeriod.EndsAtUtc);

        return Created(
            $"/api/staff/unavailable-periods/{unavailablePeriod.UnavailablePeriodId}",
            response);
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
