using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Services;

public sealed class BookingService
{
    private const int MaximumPatientReferenceLength = 50;
    private const int MaximumPatientDisplayNameLength = 100;

    private readonly AppointmentDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public BookingService(
        AppointmentDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<Booking> CreateAsync(
        int appointmentSlotId,
        string patientReference,
        string patientDisplayName,
        CancellationToken cancellationToken)
    {
        var normalizedReference = ValidateAndNormalizePatientReference(
            patientReference);
        var normalizedDisplayName = ValidateAndNormalizeDisplayName(
            patientDisplayName);

        if (appointmentSlotId <= 0)
        {
            throw new BookingValidationException(
                "AppointmentSlotId must be greater than zero.");
        }

        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var appointmentSlot = await _dbContext.AppointmentSlots
            .Include(slot => slot.AvailabilitySession)
            .ThenInclude(session => session.Clinician)
            .SingleOrDefaultAsync(
                slot => slot.AppointmentSlotId == appointmentSlotId,
                cancellationToken);

        if (appointmentSlot is null)
        {
            throw new BookingNotFoundException(
                "The appointment slot was not found.");
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        if (appointmentSlot.StartsAtUtc <= utcNow
            || !appointmentSlot.AvailabilitySession.Clinician.IsActive)
        {
            throw new BookingConflictException(
                "The appointment slot is no longer available.");
        }

        var alreadyBooked = await _dbContext.Bookings
            .AsNoTracking()
            .AnyAsync(
                booking =>
                    booking.AppointmentSlotId == appointmentSlotId
                    && booking.Status == BookingStatus.Active,
                cancellationToken);

        if (alreadyBooked)
        {
            throw new BookingConflictException(
                "The appointment slot has already been booked.");
        }

        var patient = await _dbContext.Patients
            .SingleOrDefaultAsync(
                item => item.Reference == normalizedReference,
                cancellationToken)
            ?? new Patient
            {
                Reference = normalizedReference,
                DisplayName = normalizedDisplayName
            };

        var booking = new Booking
        {
            AppointmentSlot = appointmentSlot,
            Patient = patient,
            Status = BookingStatus.Active,
            BookedAtUtc = utcNow
        };

        _dbContext.Bookings.Add(booking);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (IsActiveBookingConstraintViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            throw new BookingConflictException(
                "The appointment slot could not be booked because it is no longer available.",
                exception);
        }

        return booking;
    }

    private static bool IsActiveBookingConstraintViolation(
        DbUpdateException exception)
    {
        return exception.InnerException is SqliteException
        {
            SqliteErrorCode: 19
        } sqliteException
            && sqliteException.Message.Contains(
                "Bookings.AppointmentSlotId",
                StringComparison.Ordinal);
    }

    private static string ValidateAndNormalizePatientReference(
        string patientReference)
    {
        if (string.IsNullOrWhiteSpace(patientReference))
        {
            throw new BookingValidationException(
                "PatientReference is required.");
        }

        var normalizedReference = patientReference.Trim().ToUpperInvariant();

        if (normalizedReference.Length > MaximumPatientReferenceLength)
        {
            throw new BookingValidationException(
                $"PatientReference must not exceed {MaximumPatientReferenceLength} characters.");
        }

        return normalizedReference;
    }

    private static string ValidateAndNormalizeDisplayName(
        string patientDisplayName)
    {
        if (string.IsNullOrWhiteSpace(patientDisplayName))
        {
            throw new BookingValidationException(
                "PatientDisplayName is required.");
        }

        var normalizedDisplayName = patientDisplayName.Trim();

        if (normalizedDisplayName.Length > MaximumPatientDisplayNameLength)
        {
            throw new BookingValidationException(
                $"PatientDisplayName must not exceed {MaximumPatientDisplayNameLength} characters.");
        }

        return normalizedDisplayName;
    }
}
