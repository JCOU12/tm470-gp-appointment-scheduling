using AppointmentScheduling.Api.Contracts.Clinicians;
using AppointmentScheduling.Api.Controllers;
using AppointmentScheduling.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class CliniciansControllerTests
{
    [Fact]
    public async Task GetActiveClinicians_ReturnsOnlyActiveCliniciansInNameOrder()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppointmentDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var dbContext = new AppointmentDbContext(options);
        await dbContext.Database.EnsureCreatedAsync();

        var inactiveClinician = await dbContext.Clinicians
            .SingleAsync(clinician => clinician.Name == "Dr Sofia Ahmed");
        inactiveClinician.IsActive = false;
        await dbContext.SaveChangesAsync();

        var controller = new CliniciansController(dbContext);

        var response = await controller.GetActiveClinicians(
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var clinicians = Assert.IsAssignableFrom<IReadOnlyList<ClinicianResponse>>(
            okResult.Value);

        Assert.Collection(
            clinicians,
            clinician =>
            {
                Assert.Equal(2, clinician.ClinicianId);
                Assert.Equal("Dr Daniel Brooks", clinician.Name);
                Assert.Equal("General Practitioner", clinician.Role);
            },
            clinician =>
            {
                Assert.Equal(1, clinician.ClinicianId);
                Assert.Equal("Dr Maya Patel", clinician.Name);
                Assert.Equal("General Practitioner", clinician.Role);
            });

        Assert.DoesNotContain(
            clinicians,
            clinician => clinician.Name == "Dr Sofia Ahmed");
    }
}
