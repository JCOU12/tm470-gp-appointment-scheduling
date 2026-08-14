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

public sealed class AppointmentSlotsControllerTests
{
    private static readonly DateTime UtcNow = UtcDateTime(9, 0);

    [Fact]
    public async Task GetAvailableSlots_ReturnsFutureActiveClinicianSlotsInTimeOrder()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await SeedSlotsAsync(dbContext);
        var controller = CreateController(dbContext);

        var result = await controller.GetAvailableSlots(
            fromUtc: null,
            toUtc: null,
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var slots = Assert.IsAssignableFrom<
            IReadOnlyList<AvailableAppointmentSlotResponse>>(okResult.Value);

        Assert.Collection(
            slots,
            slot => AssertSlot(
                slot,
                clinicianId: 1,
                clinicianName: "Dr Maya Patel",
                startsAtUtc: UtcDateTime(9, 10)),
            slot => AssertSlot(
                slot,
                clinicianId: 1,
                clinicianName: "Dr Maya Patel",
                startsAtUtc: UtcDateTime(9, 20)));
    }

    [Fact]
    public async Task GetAvailableSlots_WithUtcBounds_ReturnsSlotsWithinHalfOpenRange()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await SeedSlotsAsync(dbContext);
        var controller = CreateController(dbContext);

        var result = await controller.GetAvailableSlots(
            fromUtc: UtcDateTime(9, 15),
            toUtc: UtcDateTime(9, 30),
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var slots = Assert.IsAssignableFrom<
            IReadOnlyList<AvailableAppointmentSlotResponse>>(okResult.Value);
        var slot = Assert.Single(slots);
        Assert.Equal(UtcDateTime(9, 20), slot.StartsAtUtc);
    }

    [Fact]
    public async Task GetAvailableSlots_ExcludesActivelyBookedSlot()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await SeedSlotsAsync(dbContext);
        var bookedSlot = await dbContext.AppointmentSlots
            .SingleAsync(
                slot =>
                    slot.StartsAtUtc == UtcDateTime(9, 10)
                    && slot.AvailabilitySession.ClinicianId == 1);
        dbContext.Bookings.Add(
            new Booking
            {
                AppointmentSlotId = bookedSlot.AppointmentSlotId,
                Patient = new Patient
                {
                    Reference = "PAT-001",
                    DisplayName = "Alex Morgan"
                },
                BookedAtUtc = UtcNow
            });
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
        var controller = CreateController(dbContext);

        var result = await controller.GetAvailableSlots(
            fromUtc: null,
            toUtc: null,
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var slots = Assert.IsAssignableFrom<
            IReadOnlyList<AvailableAppointmentSlotResponse>>(okResult.Value);
        var availableSlot = Assert.Single(slots);
        Assert.Equal(UtcDateTime(9, 20), availableSlot.StartsAtUtc);
    }

    [Fact]
    public async Task GetAvailableSlots_ExcludesSlotOverlappingUnavailablePeriod()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await SeedSlotsAsync(dbContext);
        dbContext.UnavailablePeriods.Add(
            new UnavailablePeriod
            {
                ClinicianId = 1,
                StartsAtUtc = UtcDateTime(9, 15),
                EndsAtUtc = UtcDateTime(9, 20)
            });
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
        var controller = CreateController(dbContext);

        var result = await controller.GetAvailableSlots(
            fromUtc: null,
            toUtc: null,
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var slots = Assert.IsAssignableFrom<
            IReadOnlyList<AvailableAppointmentSlotResponse>>(okResult.Value);
        var availableSlot = Assert.Single(slots);
        Assert.Equal(UtcDateTime(9, 20), availableSlot.StartsAtUtc);
    }

    [Theory]
    [InlineData(DateTimeKind.Local)]
    [InlineData(DateTimeKind.Unspecified)]
    public async Task GetAvailableSlots_WithNonUtcBoundary_ReturnsBadRequest(
        DateTimeKind dateTimeKind)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var from = DateTime.SpecifyKind(UtcDateTime(9, 0), dateTimeKind);

        var result = await controller.GetAvailableSlots(
            fromUtc: from,
            toUtc: null,
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("fromUtc must be UTC", problem.Detail);
    }

    [Fact]
    public async Task GetAvailableSlots_WithEndBeforeEffectiveStart_ReturnsBadRequest()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.GetAvailableSlots(
            fromUtc: null,
            toUtc: UtcDateTime(8, 59),
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("later than", problem.Detail);
    }

    private static AppointmentSlotsController CreateController(
        AppointmentDbContext dbContext)
    {
        var schedulingService = new SchedulingService(
            dbContext,
            new FixedTimeProvider(UtcNow));

        return new AppointmentSlotsController(schedulingService);
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

    private static async Task SeedSlotsAsync(AppointmentDbContext dbContext)
    {
        var activeSession = CreateSession(
            clinicianId: 1,
            startsAtUtc: UtcDateTime(8, 50),
            endsAtUtc: UtcDateTime(9, 30));
        activeSession.AppointmentSlots.Add(CreateSlot(8, 50));
        activeSession.AppointmentSlots.Add(CreateSlot(9, 10));
        activeSession.AppointmentSlots.Add(CreateSlot(9, 20));

        var inactiveSession = CreateSession(
            clinicianId: 3,
            startsAtUtc: UtcDateTime(9, 0),
            endsAtUtc: UtcDateTime(9, 30));
        inactiveSession.AppointmentSlots.Add(CreateSlot(9, 10));

        dbContext.AvailabilitySessions.AddRange(activeSession, inactiveSession);
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
    }

    private static AvailabilitySession CreateSession(
        int clinicianId,
        DateTime startsAtUtc,
        DateTime endsAtUtc)
    {
        return new AvailabilitySession
        {
            ClinicianId = clinicianId,
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = endsAtUtc,
            SlotDurationMinutes = 10
        };
    }

    private static AppointmentSlot CreateSlot(int hour, int minute)
    {
        var startsAtUtc = UtcDateTime(hour, minute);

        return new AppointmentSlot
        {
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = startsAtUtc.AddMinutes(10)
        };
    }

    private static DateTime UtcDateTime(int hour, int minute)
    {
        return new DateTime(2026, 8, 17, hour, minute, 0, DateTimeKind.Utc);
    }

    private static void AssertSlot(
        AvailableAppointmentSlotResponse slot,
        int clinicianId,
        string clinicianName,
        DateTime startsAtUtc)
    {
        Assert.True(slot.AppointmentSlotId > 0);
        Assert.True(slot.AvailabilitySessionId > 0);
        Assert.Equal(clinicianId, slot.ClinicianId);
        Assert.Equal(clinicianName, slot.ClinicianName);
        Assert.Equal("General Practitioner", slot.ClinicianRole);
        Assert.Equal(startsAtUtc, slot.StartsAtUtc);
        Assert.Equal(startsAtUtc.AddMinutes(10), slot.EndsAtUtc);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedTimeProvider(DateTime utcNow)
        {
            _utcNow = new DateTimeOffset(utcNow);
        }

        public override DateTimeOffset GetUtcNow()
        {
            return _utcNow;
        }
    }
}
