using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Services;

public sealed class BookingService
{
    private const int MaximumPatientDisplayNameLength = 100;
    private const int MaximumReferenceGenerationAttempts = 5;

    private readonly AppointmentDbContext _dbContext;
    private readonly BookingReferenceGenerator _bookingReferenceGenerator;
    private readonly TimeProvider _timeProvider;

    public BookingService(
        AppointmentDbContext dbContext,
        BookingReferenceGenerator bookingReferenceGenerator,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _bookingReferenceGenerator = bookingReferenceGenerator;
        _timeProvider = timeProvider;
    }

    public async Task<Booking> GetByReferenceAsync(
        string bookingReference,
        CancellationToken cancellationToken)
    {
        var normalisedReference = ValidateAndNormaliseBookingReference(
            bookingReference);

        var booking = await _dbContext.Bookings
            .AsNoTracking()
            .Include(item => item.Patient)
            .Include(item => item.AppointmentSlot)
            .SingleOrDefaultAsync(
                item => item.Reference == normalisedReference,
                cancellationToken);

        return booking
            ?? throw new BookingNotFoundException(
                "The booking was not found.");
    }

    public async Task<Booking> CancelAsync(
        string bookingReference,
        CancellationToken cancellationToken)
    {
        var normalisedReference = ValidateAndNormaliseBookingReference(
            bookingReference);

        var booking = await _dbContext.Bookings
            .Include(item => item.Patient)
            .Include(item => item.AppointmentSlot)
            .SingleOrDefaultAsync(
                item => item.Reference == normalisedReference,
                cancellationToken)
            ?? throw new BookingNotFoundException(
                "The booking was not found.");

        if (booking.Status == BookingStatus.Cancelled)
        {
            throw new BookingConflictException(
                "The booking has already been cancelled.");
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        if (booking.AppointmentSlot.StartsAtUtc <= utcNow)
        {
            throw new BookingConflictException(
                "The booking cannot be cancelled after the appointment has started.");
        }

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAtUtc = utcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return booking;
    }

    public async Task<Booking> CreateAsync(
        int appointmentSlotId,
        string patientDisplayName,
        CancellationToken cancellationToken)
    {
        var normalisedDisplayName = ValidateAndNormaliseDisplayName(
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

        var isBlocked = await _dbContext.UnavailablePeriods
            .AsNoTracking()
            .AnyAsync(
                period =>
                    period.ClinicianId
                        == appointmentSlot.AvailabilitySession.ClinicianId
                    && period.StartsAtUtc < appointmentSlot.EndsAtUtc
                    && appointmentSlot.StartsAtUtc < period.EndsAtUtc,
                cancellationToken);

        if (isBlocked)
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

        var patient = new Patient
        {
            DisplayName = normalisedDisplayName
        };

        var booking = new Booking
        {
            Reference = await GenerateUniqueReferenceAsync(cancellationToken),
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

    private async Task<string> GenerateUniqueReferenceAsync(
        CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaximumReferenceGenerationAttempts; attempt++)
        {
            var reference = _bookingReferenceGenerator.Generate();
            var alreadyExists = await _dbContext.Bookings
                .AsNoTracking()
                .AnyAsync(
                    booking => booking.Reference == reference,
                    cancellationToken);

            if (!alreadyExists)
            {
                return reference;
            }
        }

        throw new InvalidOperationException(
            "A unique booking reference could not be generated.");
    }

    private static string ValidateAndNormaliseBookingReference(
        string bookingReference)
    {
        if (string.IsNullOrWhiteSpace(bookingReference))
        {
            throw new BookingValidationException(
                "BookingReference is required.");
        }

        var normalisedReference = bookingReference.Trim().ToUpperInvariant();

        if (!BookingReferenceGenerator.IsValid(normalisedReference))
        {
            throw new BookingValidationException(
                $"BookingReference must use the format {BookingReferenceGenerator.Prefix} followed by {BookingReferenceGenerator.RandomCharacterCount} letters or numbers, excluding 0, 1, I and O.");
        }

        return normalisedReference;
    }

    private static string ValidateAndNormaliseDisplayName(
        string patientDisplayName)
    {
        if (string.IsNullOrWhiteSpace(patientDisplayName))
        {
            throw new BookingValidationException(
                "PatientDisplayName is required.");
        }

        var normalisedDisplayName = patientDisplayName.Trim();

        if (normalisedDisplayName.Length > MaximumPatientDisplayNameLength)
        {
            throw new BookingValidationException(
                $"PatientDisplayName must not exceed {MaximumPatientDisplayNameLength} characters.");
        }

        return normalisedDisplayName;
    }
}
