using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;

namespace AppointmentScheduling.Tests;

public sealed class AppointmentSlotGeneratorTests
{
    private readonly AppointmentSlotGenerator _generator = new();

    [Fact]
    public void Generate_CreatesContiguousSlotsThatFillSession()
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(10, 0),
            slotDurationMinutes: 20);

        var slots = _generator.Generate(session);

        Assert.Collection(
            slots,
            slot => AssertSlot(slot, session, UtcDateTime(9, 0), UtcDateTime(9, 20)),
            slot => AssertSlot(slot, session, UtcDateTime(9, 20), UtcDateTime(9, 40)),
            slot => AssertSlot(slot, session, UtcDateTime(9, 40), UtcDateTime(10, 0)));
    }

    [Fact]
    public void Generate_WhenSlotDurationMatchesSession_CreatesOneSlot()
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(9, 15),
            slotDurationMinutes: 15);

        var slot = Assert.Single(_generator.Generate(session));

        AssertSlot(slot, session, UtcDateTime(9, 0), UtcDateTime(9, 15));
    }

    [Fact]
    public void Generate_DoesNotMutateSessionSlots()
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(9, 30),
            slotDurationMinutes: 10);

        _generator.Generate(session);

        Assert.Empty(session.AppointmentSlots);
    }

    [Fact]
    public void Generate_WithNullSession_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => _generator.Generate(null!));
    }

    [Fact]
    public void Generate_WhenSessionDoesNotEndAfterItStarts_ThrowsArgumentException()
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(9, 0),
            slotDurationMinutes: 10);

        var exception = Assert.Throws<ArgumentException>(
            () => _generator.Generate(session));

        Assert.Contains("end after it starts", exception.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public void Generate_WithNonPositiveSlotDuration_ThrowsArgumentException(
        int slotDurationMinutes)
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(10, 0),
            slotDurationMinutes: slotDurationMinutes);

        var exception = Assert.Throws<ArgumentException>(
            () => _generator.Generate(session));

        Assert.Contains("greater than zero", exception.Message);
    }

    [Fact]
    public void Generate_WhenSessionCannotBeEvenlyDivided_ThrowsArgumentException()
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(9, 50),
            slotDurationMinutes: 20);

        var exception = Assert.Throws<ArgumentException>(
            () => _generator.Generate(session));

        Assert.Contains("evenly divide", exception.Message);
    }

    [Theory]
    [InlineData(DateTimeKind.Local)]
    [InlineData(DateTimeKind.Unspecified)]
    public void Generate_WhenStartIsNotUtc_ThrowsArgumentException(
        DateTimeKind dateTimeKind)
    {
        var session = CreateSession(
            startsAtUtc: DateTime.SpecifyKind(UtcDateTime(9, 0), dateTimeKind),
            endsAtUtc: UtcDateTime(10, 0),
            slotDurationMinutes: 10);

        var exception = Assert.Throws<ArgumentException>(
            () => _generator.Generate(session));

        Assert.Contains("StartsAtUtc must be UTC", exception.Message);
    }

    [Theory]
    [InlineData(DateTimeKind.Local)]
    [InlineData(DateTimeKind.Unspecified)]
    public void Generate_WhenEndIsNotUtc_ThrowsArgumentException(
        DateTimeKind dateTimeKind)
    {
        var session = CreateSession(
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: DateTime.SpecifyKind(UtcDateTime(10, 0), dateTimeKind),
            slotDurationMinutes: 10);

        var exception = Assert.Throws<ArgumentException>(
            () => _generator.Generate(session));

        Assert.Contains("EndsAtUtc must be UTC", exception.Message);
    }

    private static AvailabilitySession CreateSession(
        DateTime startsAtUtc,
        DateTime endsAtUtc,
        int slotDurationMinutes)
    {
        return new AvailabilitySession
        {
            AvailabilitySessionId = 42,
            ClinicianId = 1,
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = endsAtUtc,
            SlotDurationMinutes = slotDurationMinutes
        };
    }

    private static DateTime UtcDateTime(int hour, int minute)
    {
        return new DateTime(2026, 8, 17, hour, minute, 0, DateTimeKind.Utc);
    }

    private static void AssertSlot(
        AppointmentSlot slot,
        AvailabilitySession expectedSession,
        DateTime expectedStart,
        DateTime expectedEnd)
    {
        Assert.Same(expectedSession, slot.AvailabilitySession);
        Assert.Equal(expectedSession.AvailabilitySessionId, slot.AvailabilitySessionId);
        Assert.Equal(expectedStart, slot.StartsAtUtc);
        Assert.Equal(expectedEnd, slot.EndsAtUtc);
    }
}
