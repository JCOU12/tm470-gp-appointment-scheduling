using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class AvailabilityPersistenceTests
{
    [Fact]
    public async Task Migration_PersistsAvailabilitySessionAndSlotsWithRelationships()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);

        var session = CreateValidSession();
        session.AppointmentSlots.Add(
            new AppointmentSlot
            {
                StartsAtUtc = new DateTime(2026, 8, 17, 9, 0, 0, DateTimeKind.Utc),
                EndsAtUtc = new DateTime(2026, 8, 17, 9, 10, 0, DateTimeKind.Utc)
            });
        session.AppointmentSlots.Add(
            new AppointmentSlot
            {
                StartsAtUtc = new DateTime(2026, 8, 17, 9, 10, 0, DateTimeKind.Utc),
                EndsAtUtc = new DateTime(2026, 8, 17, 9, 20, 0, DateTimeKind.Utc)
            });

        dbContext.AvailabilitySessions.Add(session);
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        var persistedSession = await dbContext.AvailabilitySessions
            .AsNoTracking()
            .Include(availabilitySession => availabilitySession.Clinician)
            .Include(availabilitySession => availabilitySession.AppointmentSlots)
            .SingleAsync();

        Assert.Equal(1, persistedSession.ClinicianId);
        Assert.Equal("Dr Maya Patel", persistedSession.Clinician.Name);
        Assert.Equal(10, persistedSession.SlotDurationMinutes);
        Assert.Equal(DateTimeKind.Utc, persistedSession.StartsAtUtc.Kind);
        Assert.Equal(DateTimeKind.Utc, persistedSession.EndsAtUtc.Kind);

        Assert.Collection(
            persistedSession.AppointmentSlots.OrderBy(slot => slot.StartsAtUtc),
            slot =>
            {
                Assert.Equal(DateTimeKind.Utc, slot.StartsAtUtc.Kind);
                Assert.Equal(DateTimeKind.Utc, slot.EndsAtUtc.Kind);
                Assert.Equal(
                    new DateTime(2026, 8, 17, 9, 0, 0, DateTimeKind.Utc),
                    slot.StartsAtUtc);
                Assert.Equal(
                    new DateTime(2026, 8, 17, 9, 10, 0, DateTimeKind.Utc),
                    slot.EndsAtUtc);
            },
            slot =>
            {
                Assert.Equal(DateTimeKind.Utc, slot.StartsAtUtc.Kind);
                Assert.Equal(DateTimeKind.Utc, slot.EndsAtUtc.Kind);
                Assert.Equal(
                    new DateTime(2026, 8, 17, 9, 10, 0, DateTimeKind.Utc),
                    slot.StartsAtUtc);
                Assert.Equal(
                    new DateTime(2026, 8, 17, 9, 20, 0, DateTimeKind.Utc),
                    slot.EndsAtUtc);
            });
    }

    [Fact]
    public async Task AvailabilitySession_InvalidTimeRange_IsRejected()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);

        var session = CreateValidSession();
        session.EndsAtUtc = session.StartsAtUtc;

        dbContext.AvailabilitySessions.Add(session);

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    [Fact]
    public async Task AvailabilitySession_NonPositiveSlotDuration_IsRejected()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);

        var session = CreateValidSession();
        session.SlotDurationMinutes = 0;

        dbContext.AvailabilitySessions.Add(session);

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    [Fact]
    public async Task AppointmentSlot_InvalidTimeRange_IsRejected()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);

        var session = CreateValidSession();
        session.AppointmentSlots.Add(
            new AppointmentSlot
            {
                StartsAtUtc = new DateTime(2026, 8, 17, 9, 10, 0, DateTimeKind.Utc),
                EndsAtUtc = new DateTime(2026, 8, 17, 9, 0, 0, DateTimeKind.Utc)
            });

        dbContext.AvailabilitySessions.Add(session);

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    [Fact]
    public async Task AppointmentSlot_DuplicateStartWithinSession_IsRejected()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);

        var session = CreateValidSession();
        var sharedStart = new DateTime(
            2026,
            8,
            17,
            9,
            0,
            0,
            DateTimeKind.Utc);

        session.AppointmentSlots.Add(
            new AppointmentSlot
            {
                StartsAtUtc = sharedStart,
                EndsAtUtc = sharedStart.AddMinutes(10)
            });
        session.AppointmentSlots.Add(
            new AppointmentSlot
            {
                StartsAtUtc = sharedStart,
                EndsAtUtc = sharedStart.AddMinutes(20)
            });

        dbContext.AvailabilitySessions.Add(session);

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    private static async Task<AppointmentDbContext> CreateMigratedContextAsync(
        SqliteConnection connection)
    {
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppointmentDbContext>()
            .UseSqlite(connection)
            .Options;

        var dbContext = new AppointmentDbContext(options);
        await dbContext.Database.MigrateAsync();

        return dbContext;
    }

    private static AvailabilitySession CreateValidSession()
    {
        return new AvailabilitySession
        {
            ClinicianId = 1,
            StartsAtUtc = new DateTime(
                2026,
                8,
                17,
                9,
                0,
                0,
                DateTimeKind.Utc),
            EndsAtUtc = new DateTime(
                2026,
                8,
                17,
                10,
                0,
                0,
                DateTimeKind.Utc),
            SlotDurationMinutes = 10
        };
    }
}
