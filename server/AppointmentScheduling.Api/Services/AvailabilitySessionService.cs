using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Services;

public sealed class AvailabilitySessionService
{
    private readonly AppointmentDbContext _dbContext;
    private readonly AppointmentSlotGenerator _slotGenerator;

    public AvailabilitySessionService(
        AppointmentDbContext dbContext,
        AppointmentSlotGenerator slotGenerator)
    {
        _dbContext = dbContext;
        _slotGenerator = slotGenerator;
    }

    public async Task<AvailabilitySession> CreateAsync(
        AvailabilitySession availabilitySession,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(availabilitySession);

        IReadOnlyList<AppointmentSlot> appointmentSlots;

        try
        {
            appointmentSlots = _slotGenerator.Generate(availabilitySession);
        }
        catch (ArgumentException exception)
        {
            throw new AvailabilitySessionValidationException(
                exception.Message,
                exception);
        }

        var clinicianIsActive = await _dbContext.Clinicians
            .AsNoTracking()
            .AnyAsync(
                clinician =>
                    clinician.ClinicianId == availabilitySession.ClinicianId
                    && clinician.IsActive,
                cancellationToken);

        if (!clinicianIsActive)
        {
            throw new AvailabilitySessionValidationException(
                "The clinician does not exist or is inactive.");
        }

        var overlapsExistingSession = await _dbContext.AvailabilitySessions
            .AsNoTracking()
            .AnyAsync(
                existingSession =>
                    existingSession.ClinicianId
                        == availabilitySession.ClinicianId
                    && existingSession.StartsAtUtc
                        < availabilitySession.EndsAtUtc
                    && availabilitySession.StartsAtUtc
                        < existingSession.EndsAtUtc,
                cancellationToken);

        if (overlapsExistingSession)
        {
            throw new AvailabilitySessionConflictException(
                "The availability session overlaps an existing session for the clinician.");
        }

        foreach (var appointmentSlot in appointmentSlots)
        {
            availabilitySession.AppointmentSlots.Add(appointmentSlot);
        }

        _dbContext.AvailabilitySessions.Add(availabilitySession);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return availabilitySession;
    }
}
