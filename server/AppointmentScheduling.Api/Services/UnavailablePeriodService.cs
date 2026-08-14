using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Services;

public sealed class UnavailablePeriodService
{
    private readonly AppointmentDbContext _dbContext;

    public UnavailablePeriodService(AppointmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UnavailablePeriod> CreateAsync(
        UnavailablePeriod unavailablePeriod,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(unavailablePeriod);

        Validate(unavailablePeriod);

        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var clinicianIsActive = await _dbContext.Clinicians
            .AsNoTracking()
            .AnyAsync(
                clinician =>
                    clinician.ClinicianId == unavailablePeriod.ClinicianId
                    && clinician.IsActive,
                cancellationToken);

        if (!clinicianIsActive)
        {
            throw new UnavailablePeriodValidationException(
                "The clinician does not exist or is inactive.");
        }

        var overlapsExistingPeriod = await _dbContext.UnavailablePeriods
            .AsNoTracking()
            .AnyAsync(
                existingPeriod =>
                    existingPeriod.ClinicianId == unavailablePeriod.ClinicianId
                    && existingPeriod.StartsAtUtc < unavailablePeriod.EndsAtUtc
                    && unavailablePeriod.StartsAtUtc < existingPeriod.EndsAtUtc,
                cancellationToken);

        if (overlapsExistingPeriod)
        {
            throw new UnavailablePeriodConflictException(
                "The unavailable period overlaps an existing unavailable period for the clinician.");
        }

        var overlapsActiveBooking = await _dbContext.Bookings
            .AsNoTracking()
            .AnyAsync(
                booking =>
                    booking.Status == BookingStatus.Active
                    && booking.AppointmentSlot.AvailabilitySession.ClinicianId
                        == unavailablePeriod.ClinicianId
                    && booking.AppointmentSlot.StartsAtUtc
                        < unavailablePeriod.EndsAtUtc
                    && unavailablePeriod.StartsAtUtc
                        < booking.AppointmentSlot.EndsAtUtc,
                cancellationToken);

        if (overlapsActiveBooking)
        {
            throw new UnavailablePeriodConflictException(
                "The unavailable period overlaps an active booking for the clinician.");
        }

        _dbContext.UnavailablePeriods.Add(unavailablePeriod);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return unavailablePeriod;
    }

    private static void Validate(UnavailablePeriod unavailablePeriod)
    {
        if (unavailablePeriod.ClinicianId <= 0)
        {
            throw new UnavailablePeriodValidationException(
                "ClinicianId must be greater than zero.");
        }

        if (unavailablePeriod.StartsAtUtc.Kind != DateTimeKind.Utc
            || unavailablePeriod.EndsAtUtc.Kind != DateTimeKind.Utc)
        {
            throw new UnavailablePeriodValidationException(
                "Unavailable period boundaries must be UTC.");
        }

        if (unavailablePeriod.EndsAtUtc <= unavailablePeriod.StartsAtUtc)
        {
            throw new UnavailablePeriodValidationException(
                "The unavailable period must end after it starts.");
        }
    }
}
