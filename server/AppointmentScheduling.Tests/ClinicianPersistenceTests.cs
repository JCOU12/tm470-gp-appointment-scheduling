using AppointmentScheduling.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class ClinicianPersistenceTests
{
    [Fact]
    public async Task SeedMigration_InsertsSofiaAsInactive()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppointmentDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var dbContext = new AppointmentDbContext(options);
        await dbContext.Database.MigrateAsync();

        var clinicians = await dbContext.Clinicians
            .AsNoTracking()
            .OrderBy(clinician => clinician.ClinicianId)
            .ToListAsync();

        Assert.Collection(
            clinicians,
            clinician => Assert.True(clinician.IsActive),
            clinician => Assert.True(clinician.IsActive),
            clinician => Assert.False(clinician.IsActive));

        Assert.Equal("Dr Sofia Ahmed", clinicians[2].Name);
    }
}
