using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class UnavailablePeriodPersistenceTests
{
    [Fact]
    public async Task Migration_PersistsUnavailablePeriodWithClinicianRelationship()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var period = CreateValidPeriod();

        dbContext.UnavailablePeriods.Add(period);
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        var persistedPeriod = await dbContext.UnavailablePeriods
            .AsNoTracking()
            .Include(item => item.Clinician)
            .SingleAsync();
        Assert.True(persistedPeriod.UnavailablePeriodId > 0);
        Assert.Equal(1, persistedPeriod.ClinicianId);
        Assert.Equal("Dr Maya Patel", persistedPeriod.Clinician.Name);
        Assert.Equal(period.StartsAtUtc, persistedPeriod.StartsAtUtc);
        Assert.Equal(period.EndsAtUtc, persistedPeriod.EndsAtUtc);
    }

    [Fact]
    public async Task UnavailablePeriod_InvalidTimeRange_IsRejected()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var period = CreateValidPeriod();
        period.EndsAtUtc = period.StartsAtUtc;
        dbContext.UnavailablePeriods.Add(period);

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

    private static UnavailablePeriod CreateValidPeriod()
    {
        return new UnavailablePeriod
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
                9,
                30,
                0,
                DateTimeKind.Utc)
        };
    }
}
