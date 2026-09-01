using AppointmentScheduling.Api.Contracts.Availability;
using AppointmentScheduling.Api.Controllers;
using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class StaffAvailabilitySessionsControllerTests
{
    [Fact]
    public async Task Create_ValidRequest_PersistsSessionAndGeneratedSlots()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest();

        var response = await controller.Create(request, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedResult>(response.Result);
        var createdSession = Assert.IsType<AvailabilitySessionResponse>(
            createdResult.Value);

        Assert.Equal(
            $"/api/staff/sessions/{createdSession.AvailabilitySessionId}",
            createdResult.Location);
        Assert.Equal(request.ClinicianId, createdSession.ClinicianId);
        Assert.Equal(request.StartsAtUtc, createdSession.StartsAtUtc);
        Assert.Equal(request.EndsAtUtc, createdSession.EndsAtUtc);
        Assert.Equal(request.SlotDurationMinutes, createdSession.SlotDurationMinutes);
        Assert.Collection(
            createdSession.AppointmentSlots,
            slot => AssertSlot(slot, UtcDateTime(9, 0), UtcDateTime(9, 20)),
            slot => AssertSlot(slot, UtcDateTime(9, 20), UtcDateTime(9, 40)),
            slot => AssertSlot(slot, UtcDateTime(9, 40), UtcDateTime(10, 0)));

        dbContext.ChangeTracker.Clear();

        var persistedSession = await dbContext.AvailabilitySessions
            .AsNoTracking()
            .Include(session => session.AppointmentSlots)
            .SingleAsync();

        Assert.Equal(
            createdSession.AvailabilitySessionId,
            persistedSession.AvailabilitySessionId);
        Assert.Equal(3, persistedSession.AppointmentSlots.Count);
        Assert.All(
            persistedSession.AppointmentSlots,
            slot => Assert.Equal(
                persistedSession.AvailabilitySessionId,
                slot.AvailabilitySessionId));
    }

    [Fact]
    public async Task Create_InvalidTimeRange_ReturnsBadRequestWithoutPersisting()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest() with
        {
            EndsAtUtc = UtcDateTime(9, 0)
        };

        var response = await controller.Create(request, CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("end after it starts", problem.Detail);
        Assert.Empty(await dbContext.AvailabilitySessions.ToListAsync());
        Assert.Empty(await dbContext.AppointmentSlots.ToListAsync());
    }

    [Fact]
    public async Task Create_InactiveClinician_ReturnsBadRequestWithoutPersisting()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest() with
        {
            ClinicianId = 3
        };

        var response = await controller.Create(request, CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("inactive", problem.Detail);
        Assert.Empty(await dbContext.AvailabilitySessions.ToListAsync());
    }

    [Fact]
    public async Task Create_OverlappingSession_ReturnsConflictWithoutPersisting()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        dbContext.AvailabilitySessions.Add(
            new AvailabilitySession
            {
                ClinicianId = 1,
                StartsAtUtc = UtcDateTime(8, 30),
                EndsAtUtc = UtcDateTime(9, 30),
                SlotDurationMinutes = 10
            });
        await dbContext.SaveChangesAsync();
        var controller = CreateController(dbContext);

        var response = await controller.Create(
            CreateValidRequest(),
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("overlaps", problem.Detail);
        Assert.Equal(1, await dbContext.AvailabilitySessions.CountAsync());
        Assert.Empty(await dbContext.AppointmentSlots.ToListAsync());
    }

    [Fact]
    public async Task Create_AdjacentSession_DoesNotConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        dbContext.AvailabilitySessions.Add(
            new AvailabilitySession
            {
                ClinicianId = 1,
                StartsAtUtc = UtcDateTime(8, 0),
                EndsAtUtc = UtcDateTime(9, 0),
                SlotDurationMinutes = 10
            });
        await dbContext.SaveChangesAsync();
        var controller = CreateController(dbContext);

        var response = await controller.Create(
            CreateValidRequest(),
            CancellationToken.None);

        Assert.IsType<CreatedResult>(response.Result);
        Assert.Equal(2, await dbContext.AvailabilitySessions.CountAsync());
        Assert.Equal(3, await dbContext.AppointmentSlots.CountAsync());
    }

    private static StaffAvailabilitySessionsController CreateController(
        AppointmentDbContext dbContext)
    {
        var service = new AvailabilitySessionService(
            dbContext,
            new AppointmentSlotGenerator());

        return new StaffAvailabilitySessionsController(service);
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

    private static CreateAvailabilitySessionRequest CreateValidRequest()
    {
        return new CreateAvailabilitySessionRequest(
            ClinicianId: 1,
            StartsAtUtc: UtcDateTime(9, 0),
            EndsAtUtc: UtcDateTime(10, 0),
            SlotDurationMinutes: 20);
    }

    private static DateTime UtcDateTime(int hour, int minute)
    {
        return new DateTime(2026, 8, 17, hour, minute, 0, DateTimeKind.Utc);
    }

    private static void AssertSlot(
        AppointmentSlotResponse slot,
        DateTime expectedStart,
        DateTime expectedEnd)
    {
        Assert.True(slot.AppointmentSlotId > 0);
        Assert.Equal(expectedStart, slot.StartsAtUtc);
        Assert.Equal(expectedEnd, slot.EndsAtUtc);
    }
}
