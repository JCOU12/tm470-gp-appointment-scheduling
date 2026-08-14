using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Services;

public sealed class StaffBookingQueryService
{
    private readonly AppointmentDbContext _dbContext;

    public StaffBookingQueryService(AppointmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Booking>> GetBookingsAsync(
        int? clinicianId,
        DateTime? fromUtc,
        DateTime? toUtc,
        BookingStatus? status,
        CancellationToken cancellationToken)
    {
        ValidateFilters(clinicianId, fromUtc, toUtc);

        var query = _dbContext.Bookings
            .AsNoTracking()
            .Include(booking => booking.Patient)
            .Include(booking => booking.AppointmentSlot)
            .ThenInclude(slot => slot.AvailabilitySession)
            .ThenInclude(session => session.Clinician)
            .AsQueryable();

        if (clinicianId is not null)
        {
            query = query.Where(
                booking =>
                    booking.AppointmentSlot.AvailabilitySession.ClinicianId
                        == clinicianId.Value);
        }

        if (fromUtc is not null)
        {
            query = query.Where(
                booking => booking.AppointmentSlot.StartsAtUtc >= fromUtc.Value);
        }

        if (toUtc is not null)
        {
            query = query.Where(
                booking => booking.AppointmentSlot.StartsAtUtc < toUtc.Value);
        }

        if (status is not null)
        {
            query = query.Where(booking => booking.Status == status.Value);
        }

        return await query
            .OrderBy(booking => booking.AppointmentSlot.StartsAtUtc)
            .ThenBy(booking => booking.BookingId)
            .ToListAsync(cancellationToken);
    }

    private static void ValidateFilters(
        int? clinicianId,
        DateTime? fromUtc,
        DateTime? toUtc)
    {
        if (clinicianId is not null && clinicianId <= 0)
        {
            throw new StaffBookingQueryValidationException(
                "clinicianId must be greater than zero.");
        }

        ValidateUtcBoundary(fromUtc, nameof(fromUtc));
        ValidateUtcBoundary(toUtc, nameof(toUtc));

        if (fromUtc is not null && toUtc is not null && toUtc <= fromUtc)
        {
            throw new StaffBookingQueryValidationException(
                "toUtc must be later than fromUtc.");
        }
    }

    private static void ValidateUtcBoundary(
        DateTime? boundary,
        string parameterName)
    {
        if (boundary is not null && boundary.Value.Kind != DateTimeKind.Utc)
        {
            throw new StaffBookingQueryValidationException(
                $"{parameterName} must be UTC.");
        }
    }
}
