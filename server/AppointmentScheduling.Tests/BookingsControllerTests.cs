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

public sealed class BookingsControllerTests
{
    private static readonly DateTime UtcNow = UtcDateTime(9, 0);

    [Fact]
    public async Task Create_AvailableSlot_PersistsActiveBookingAndReturnsCreated()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var controller = CreateController(dbContext);
        var request = new CreateBookingRequest(
            slot.AppointmentSlotId,
            " pat-001 ",
            " Alex Morgan ");

        var result = await controller.Create(request, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedResult>(result.Result);
        var response = Assert.IsType<BookingResponse>(createdResult.Value);
        Assert.Equal($"/api/bookings/{response.BookingId}", createdResult.Location);
        Assert.Equal(slot.AppointmentSlotId, response.AppointmentSlotId);
        Assert.Equal("PAT-001", response.PatientReference);
        Assert.Equal("Alex Morgan", response.PatientDisplayName);
        Assert.Equal("Active", response.Status);
        Assert.Equal(UtcNow, response.BookedAtUtc);
        Assert.Equal(UtcDateTime(9, 10), response.StartsAtUtc);
        Assert.Equal(UtcDateTime(9, 20), response.EndsAtUtc);

        dbContext.ChangeTracker.Clear();
        var booking = await dbContext.Bookings
            .AsNoTracking()
            .Include(item => item.Patient)
            .SingleAsync();
        Assert.Equal(BookingStatus.Active, booking.Status);
        Assert.Equal("PAT-001", booking.Patient.Reference);
    }

    [Fact]
    public async Task Create_AlreadyBookedSlot_ReturnsConflictAndKeepsOneBooking()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var controller = CreateController(dbContext);

        var firstResult = await controller.Create(
            new CreateBookingRequest(slot.AppointmentSlotId, "PAT-001", "Alex"),
            CancellationToken.None);
        var secondResult = await controller.Create(
            new CreateBookingRequest(slot.AppointmentSlotId, "PAT-002", "Sam"),
            CancellationToken.None);

        Assert.IsType<CreatedResult>(firstResult.Result);
        var conflict = Assert.IsType<ObjectResult>(secondResult.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Contains("already been booked", problem.Detail);
        Assert.Equal(1, await dbContext.Bookings.CountAsync());
        Assert.Equal(1, await dbContext.Patients.CountAsync());
    }

    [Fact]
    public async Task Create_MissingSlot_ReturnsNotFoundWithoutPersistingPatient()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            new CreateBookingRequest(999, "PAT-001", "Alex"),
            CancellationToken.None);

        var notFound = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
        Assert.Empty(await dbContext.Patients.ToListAsync());
        Assert.Empty(await dbContext.Bookings.ToListAsync());
    }

    [Fact]
    public async Task Create_ExpiredSlot_ReturnsConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 8, minute: 50);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            new CreateBookingRequest(slot.AppointmentSlotId, "PAT-001", "Alex"),
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        Assert.Empty(await dbContext.Bookings.ToListAsync());
    }

    [Fact]
    public async Task Create_InactiveClinicianSlot_ReturnsConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 3, hour: 9, minute: 10);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            new CreateBookingRequest(slot.AppointmentSlotId, "PAT-001", "Alex"),
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        Assert.Empty(await dbContext.Bookings.ToListAsync());
    }

    [Theory]
    [InlineData(0, "PAT-001", "Alex")]
    [InlineData(1, "", "Alex")]
    [InlineData(1, "PAT-001", " ")]
    public async Task Create_InvalidRequest_ReturnsBadRequest(
        int slotId,
        string patientReference,
        string patientDisplayName)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            new CreateBookingRequest(
                slotId,
                patientReference,
                patientDisplayName),
            CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.Empty(await dbContext.Bookings.ToListAsync());
    }

    [Fact]
    public async Task Create_ExistingPatientReference_ReusesPatient()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        dbContext.Patients.Add(
            new Patient
            {
                Reference = "PAT-001",
                DisplayName = "Alex Morgan"
            });
        await dbContext.SaveChangesAsync();
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var controller = CreateController(dbContext);

        var result = await controller.Create(
            new CreateBookingRequest(slot.AppointmentSlotId, "pat-001", "Different Name"),
            CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result.Result);
        var response = Assert.IsType<BookingResponse>(created.Value);
        Assert.Equal("Alex Morgan", response.PatientDisplayName);
        Assert.Equal(1, await dbContext.Patients.CountAsync());
    }

    private static BookingsController CreateController(
        AppointmentDbContext dbContext)
    {
        return new BookingsController(
            new BookingService(dbContext, new FixedTimeProvider(UtcNow)));
    }

    private static async Task<AppointmentSlot> CreateSlotAsync(
        AppointmentDbContext dbContext,
        int clinicianId,
        int hour,
        int minute)
    {
        var startsAtUtc = UtcDateTime(hour, minute);
        var session = new AvailabilitySession
        {
            ClinicianId = clinicianId,
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = startsAtUtc.AddMinutes(10),
            SlotDurationMinutes = 10
        };
        var slot = new AppointmentSlot
        {
            StartsAtUtc = startsAtUtc,
            EndsAtUtc = startsAtUtc.AddMinutes(10)
        };
        session.AppointmentSlots.Add(slot);
        dbContext.AvailabilitySessions.Add(session);
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        return slot;
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
