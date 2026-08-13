using AppointmentScheduling.Api.Models;

namespace AppointmentScheduling.Api.Services;

public sealed class AppointmentSlotGenerator
{
    public IReadOnlyList<AppointmentSlot> Generate(
        AvailabilitySession availabilitySession)
    {
        ArgumentNullException.ThrowIfNull(availabilitySession);

        Validate(availabilitySession);

        var slotDuration = TimeSpan.FromMinutes(
            availabilitySession.SlotDurationMinutes);
        var sessionDuration =
            availabilitySession.EndsAtUtc - availabilitySession.StartsAtUtc;
        var slotCount = checked((int)(sessionDuration.Ticks / slotDuration.Ticks));
        var slots = new List<AppointmentSlot>(slotCount);

        for (var startsAtUtc = availabilitySession.StartsAtUtc;
             startsAtUtc < availabilitySession.EndsAtUtc;
             startsAtUtc = startsAtUtc.Add(slotDuration))
        {
            slots.Add(
                new AppointmentSlot
                {
                    AvailabilitySessionId =
                        availabilitySession.AvailabilitySessionId,
                    AvailabilitySession = availabilitySession,
                    StartsAtUtc = startsAtUtc,
                    EndsAtUtc = startsAtUtc.Add(slotDuration)
                });
        }

        return slots.AsReadOnly();
    }

    private static void Validate(AvailabilitySession availabilitySession)
    {
        if (availabilitySession.StartsAtUtc.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException(
                "StartsAtUtc must be UTC.",
                nameof(availabilitySession));
        }

        if (availabilitySession.EndsAtUtc.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException(
                "EndsAtUtc must be UTC.",
                nameof(availabilitySession));
        }

        if (availabilitySession.EndsAtUtc <= availabilitySession.StartsAtUtc)
        {
            throw new ArgumentException(
                "The availability session must end after it starts.",
                nameof(availabilitySession));
        }

        if (availabilitySession.SlotDurationMinutes <= 0)
        {
            throw new ArgumentException(
                "SlotDurationMinutes must be greater than zero.",
                nameof(availabilitySession));
        }

        var sessionDuration =
            availabilitySession.EndsAtUtc - availabilitySession.StartsAtUtc;
        var slotDuration = TimeSpan.FromMinutes(
            availabilitySession.SlotDurationMinutes);

        if (sessionDuration.Ticks % slotDuration.Ticks != 0)
        {
            throw new ArgumentException(
                "SlotDurationMinutes must evenly divide the availability session.",
                nameof(availabilitySession));
        }
    }
}
