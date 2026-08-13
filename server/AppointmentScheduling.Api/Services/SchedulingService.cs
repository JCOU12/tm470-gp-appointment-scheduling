using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Services;

public sealed class SchedulingService
{
    private readonly AppointmentDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public SchedulingService(
        AppointmentDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<IReadOnlyList<AppointmentSlot>> GetAvailableSlotsAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken)
    {
        ValidateUtcBoundary(fromUtc, nameof(fromUtc));
        ValidateUtcBoundary(toUtc, nameof(toUtc));

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var effectiveFromUtc = fromUtc is not null && fromUtc > utcNow
            ? fromUtc.Value
            : utcNow;

        if (toUtc is not null && toUtc <= effectiveFromUtc)
        {
            throw new AvailableSlotsQueryValidationException(
                "toUtc must be later than the effective query start.");
        }

        var query = _dbContext.AppointmentSlots
            .AsNoTracking()
            .Include(slot => slot.AvailabilitySession)
            .ThenInclude(session => session.Clinician)
            .Where(
                slot =>
                    slot.StartsAtUtc >= effectiveFromUtc
                    && slot.AvailabilitySession.Clinician.IsActive);

        if (toUtc is not null)
        {
            query = query.Where(slot => slot.StartsAtUtc < toUtc.Value);
        }

        return await query
            .OrderBy(slot => slot.StartsAtUtc)
            .ThenBy(slot => slot.AppointmentSlotId)
            .ToListAsync(cancellationToken);
    }

    private static void ValidateUtcBoundary(
        DateTime? boundary,
        string parameterName)
    {
        if (boundary is not null && boundary.Value.Kind != DateTimeKind.Utc)
        {
            throw new AvailableSlotsQueryValidationException(
                $"{parameterName} must be UTC.");
        }
    }
}
