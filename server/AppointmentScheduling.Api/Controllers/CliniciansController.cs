using AppointmentScheduling.Api.Contracts.Clinicians;
using AppointmentScheduling.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CliniciansController : ControllerBase
{
    private readonly AppointmentDbContext _dbContext;

    public CliniciansController(AppointmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ClinicianResponse>>(
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ClinicianResponse>>> GetActiveClinicians(
        CancellationToken cancellationToken)
    {
        var clinicians = await _dbContext.Clinicians
            .AsNoTracking()
            .Where(clinician => clinician.IsActive)
            .OrderBy(clinician => clinician.Name)
            .Select(clinician => new ClinicianResponse(
                clinician.ClinicianId,
                clinician.Name,
                clinician.Role))
            .ToListAsync(cancellationToken);

        return Ok(clinicians);
    }
}