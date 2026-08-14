using AppointmentScheduling.Api.Contracts.UnavailablePeriods;
using AppointmentScheduling.Api.Controllers;
using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class StaffUnavailablePeriodsControllerTests
{
    [Fact]
    public async Task Create_ValidRequest_PersistsUnavailablePeriod()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest();

        var result = await controller.Create(request, CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result.Result);
        var response = Assert.IsType<UnavailablePeriodResponse>(created.Value);
        Assert.Equal(
            $"/api/staff/unavailable-periods/{response.UnavailablePeriodId}",
            created.Location);
        Assert.Equal(request.ClinicianId, response.ClinicianId);
        Assert.Equal(request.StartsAtUtc, response.StartsAtUtc);
        Assert.Equal(request.EndsAtUtc, response.EndsAtUtc);

        dbContext.ChangeTracker.Clear();
        var persistedPeriod = await dbContext.UnavailablePeriods
            .AsNoTracking()
            .SingleAsync();
        Assert.Equal(response.UnavailablePeriodId, persistedPeriod.UnavailablePeriodId);
    }

    [Theory]
    [InlineData(DateTimeKind.Local)]
    [InlineData(DateTimeKind.Unspecified)]
    public async Task Create_NonUtcBoundary_ReturnsBadRequest(
        DateTimeKind dateTimeKind)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest() with
        {
            StartsAtUtc = DateTime.SpecifyKind(
                CreateValidRequest().StartsAtUtc,
                dateTimeKind)
        };

        var result = await controller.Create(request, CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Contains("UTC", problem.Detail);
        Assert.Empty(await dbContext.UnavailablePeriods.ToListAsync());
    }

    [Fact]
    public async Task Create_InvalidTimeRange_ReturnsBadRequest()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest() with
        {
            EndsAtUtc = CreateValidRequest().StartsAtUtc
        };

        var result = await controller.Create(request, CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Contains("end after", problem.Detail);
        Assert.Empty(await dbContext.UnavailablePeriods.ToListAsync());
    }

    [Fact]
    public async Task Create_InactiveClinician_ReturnsBadRequest()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var request = CreateValidRequest() with
        {
            ClinicianId = 3
        };

        var result = await controller.Create(request, CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.Empty(await dbContext.UnavailablePeriods.ToListAsync());
    }

    [Fact]
    public async Task Create_OverlappingPeriod_ReturnsConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        dbContext.UnavailablePeriods.Add(
            new UnavailablePeriod
            {
                ClinicianId = 1,
                StartsAtUtc = UtcDateTime(9, 30),
                EndsAtUtc = UtcDateTime(10, 0)
            });
        await dbContext.SaveChangesAsync();
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            CreateValidRequest(),
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Contains("overlaps", problem.Detail);
        Assert.Equal(1, await dbContext.UnavailablePeriods.CountAsync());
    }

    [Fact]
    public async Task Create_AdjacentPeriod_DoesNotConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        dbContext.UnavailablePeriods.Add(
            new UnavailablePeriod
            {
                ClinicianId = 1,
                StartsAtUtc = UtcDateTime(9, 0),
                EndsAtUtc = UtcDateTime(9, 30)
            });
        await dbContext.SaveChangesAsync();
        var controller = CreateController(dbContext);
        var request = new CreateUnavailablePeriodRequest(
            ClinicianId: 1,
            StartsAtUtc: UtcDateTime(9, 30),
            EndsAtUtc: UtcDateTime(10, 0));

        var result = await controller.Create(request, CancellationToken.None);

        Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal(2, await dbContext.UnavailablePeriods.CountAsync());
    }

    [Fact]
    public async Task Create_PeriodOverlappingActiveBooking_ReturnsConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await AddBookingAsync(dbContext, BookingStatus.Active);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            CreateValidRequest(),
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Contains("active booking", problem.Detail);
        Assert.Empty(await dbContext.UnavailablePeriods.ToListAsync());
    }

    [Fact]
    public async Task Create_PeriodOverlappingCancelledBooking_IsAllowed()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await AddBookingAsync(dbContext, BookingStatus.Cancelled);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            CreateValidRequest(),
            CancellationToken.None);

        Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal(1, await dbContext.UnavailablePeriods.CountAsync());
    }

    private static StaffUnavailablePeriodsController CreateController(
        AppointmentDbContext dbContext)
    {
        return new StaffUnavailablePeriodsController(
            new UnavailablePeriodService(dbContext));
    }

    private static async Task AddBookingAsync(
        AppointmentDbContext dbContext,
        BookingStatus status)
    {
        var session = new AvailabilitySession
        {
            ClinicianId = 1,
            StartsAtUtc = UtcDateTime(9, 30),
            EndsAtUtc = UtcDateTime(10, 0),
            SlotDurationMinutes = 30
        };
        var slot = new AppointmentSlot
        {
            StartsAtUtc = UtcDateTime(9, 30),
            EndsAtUtc = UtcDateTime(10, 0)
        };
        session.AppointmentSlots.Add(slot);
        dbContext.AvailabilitySessions.Add(session);
        dbContext.Bookings.Add(
            new Booking
            {
                AppointmentSlot = slot,
                Patient = new Patient
                {
                    Reference = "PAT-001",
                    DisplayName = "Alex Morgan"
                },
                Status = status,
                BookedAtUtc = UtcDateTime(9, 0),
                CancelledAtUtc = status == BookingStatus.Cancelled
                    ? UtcDateTime(9, 5)
                    : null
            });
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
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

    private static CreateUnavailablePeriodRequest CreateValidRequest()
    {
        return new CreateUnavailablePeriodRequest(
            ClinicianId: 1,
            StartsAtUtc: UtcDateTime(9, 45),
            EndsAtUtc: UtcDateTime(10, 15));
    }

    private static DateTime UtcDateTime(int hour, int minute)
    {
        return new DateTime(2026, 8, 17, hour, minute, 0, DateTimeKind.Utc);
    }
}
