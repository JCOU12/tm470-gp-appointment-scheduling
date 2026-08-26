using AppointmentScheduling.Api.Contracts.Bookings;
using AppointmentScheduling.Api.Controllers;
using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class StaffBookingsControllerTests
{
    [Fact]
    public async Task Get_WithoutFilters_ReturnsBookingInformationInAppointmentOrder()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await SeedBookingsAsync(dbContext);
        var controller = CreateController(dbContext);

        var result = await controller.Get(
            clinicianId: null,
            fromUtc: null,
            toUtc: null,
            status: null,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var bookings = Assert.IsAssignableFrom<
            IReadOnlyList<StaffBookingResponse>>(ok.Value);
        Assert.Collection(
            bookings,
            booking =>
            {
                Assert.Equal("Cancelled", booking.Status);
                Assert.Equal(2, booking.ClinicianId);
                Assert.Equal("Dr Daniel Brooks", booking.ClinicianName);
                Assert.Equal("APT-3BCDEFGH", booking.BookingReference);
                Assert.Equal(UtcDateTime(9, 30), booking.StartsAtUtc);
                Assert.NotNull(booking.CancelledAtUtc);
            },
            booking =>
            {
                Assert.Equal("Active", booking.Status);
                Assert.Equal(1, booking.ClinicianId);
                Assert.Equal("Dr Maya Patel", booking.ClinicianName);
                Assert.Equal("APT-2BCDEFGH", booking.BookingReference);
                Assert.Equal("Alex Morgan", booking.PatientDisplayName);
                Assert.Equal(UtcDateTime(10, 0), booking.StartsAtUtc);
                Assert.Null(booking.CancelledAtUtc);
            });
    }

    [Fact]
    public async Task Get_WithFilters_ReturnsMatchingBooking()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        await SeedBookingsAsync(dbContext);
        var controller = CreateController(dbContext);

        var result = await controller.Get(
            clinicianId: 1,
            fromUtc: UtcDateTime(9, 45),
            toUtc: UtcDateTime(10, 30),
            status: BookingStatus.Active,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var bookings = Assert.IsAssignableFrom<
            IReadOnlyList<StaffBookingResponse>>(ok.Value);
        var booking = Assert.Single(bookings);
        Assert.Equal(1, booking.ClinicianId);
        Assert.Equal("Active", booking.Status);
        Assert.Equal(UtcDateTime(10, 0), booking.StartsAtUtc);
    }

    [Fact]
    public async Task Get_WithInvalidClinicianId_ReturnsBadRequest()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.Get(
            clinicianId: 0,
            fromUtc: null,
            toUtc: null,
            status: null,
            CancellationToken.None);

        AssertBadRequest(result, "clinicianId");
    }

    [Fact]
    public async Task Get_WithNonUtcBoundary_ReturnsBadRequest()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);
        var localBoundary = DateTime.SpecifyKind(
            UtcDateTime(9, 0),
            DateTimeKind.Local);

        var result = await controller.Get(
            clinicianId: null,
            fromUtc: localBoundary,
            toUtc: null,
            status: null,
            CancellationToken.None);

        AssertBadRequest(result, "fromUtc must be UTC");
    }

    [Fact]
    public async Task Get_WithInvalidTimeRange_ReturnsBadRequest()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.Get(
            clinicianId: null,
            fromUtc: UtcDateTime(10, 0),
            toUtc: UtcDateTime(10, 0),
            status: null,
            CancellationToken.None);

        AssertBadRequest(result, "later than");
    }

    private static StaffBookingsController CreateController(
        AppointmentDbContext dbContext)
    {
        return new StaffBookingsController(
            new StaffBookingQueryService(dbContext));
    }

    private static async Task SeedBookingsAsync(AppointmentDbContext dbContext)
    {
        dbContext.Bookings.AddRange(
            CreateBooking(
                bookingReference: "APT-2BCDEFGH",
                clinicianId: 1,
                hour: 10,
                minute: 0,
                patientDisplayName: "Alex Morgan",
                status: BookingStatus.Active),
            CreateBooking(
                bookingReference: "APT-3BCDEFGH",
                clinicianId: 2,
                hour: 9,
                minute: 30,
                patientDisplayName: "Sam Taylor",
                status: BookingStatus.Cancelled));
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
    }

    private static Booking CreateBooking(
        string bookingReference,
        int clinicianId,
        int hour,
        int minute,
        string patientDisplayName,
        BookingStatus status)
    {
        var startsAtUtc = UtcDateTime(hour, minute);
        var session = new AvailabilitySession
        {
            ClinicianId = clinicianId,
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = startsAtUtc.AddMinutes(20),
            SlotDurationMinutes = 20
        };
        var slot = new AppointmentSlot
        {
            AvailabilitySession = session,
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = startsAtUtc.AddMinutes(20)
        };

        return new Booking
        {
            Reference = bookingReference,
            AppointmentSlot = slot,
            Patient = new Patient
            {
                DisplayName = patientDisplayName
            },
            Status = status,
            BookedAtUtc = UtcDateTime(9, 0),
            CancelledAtUtc = status == BookingStatus.Cancelled
                ? UtcDateTime(9, 10)
                : null
        };
    }

    private static void AssertBadRequest(
        ActionResult<IReadOnlyList<StaffBookingResponse>> result,
        string expectedDetail)
    {
        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains(expectedDetail, problem.Detail);
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

    private static DateTime UtcDateTime(int hour, int minute)
    {
        return new DateTime(2026, 8, 17, hour, minute, 0, DateTimeKind.Utc);
    }
}
