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
        Assert.Null(response.CancelledAtUtc);
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

    [Fact]
    public async Task Create_BlockedSlot_ReturnsConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        dbContext.UnavailablePeriods.Add(
            new UnavailablePeriod
            {
                ClinicianId = 1,
                StartsAtUtc = UtcDateTime(9, 15),
                EndsAtUtc = UtcDateTime(9, 20)
            });
        await dbContext.SaveChangesAsync();
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

    [Fact]
    public async Task GetById_ExistingBooking_ReturnsStoredBooking()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var controller = CreateController(dbContext);
        var createResult = await controller.Create(
            new CreateBookingRequest(
                slot.AppointmentSlotId,
                "PAT-001",
                "Alex Morgan"),
            CancellationToken.None);
        var created = Assert.IsType<CreatedResult>(createResult.Result);
        var createdResponse = Assert.IsType<BookingResponse>(created.Value);

        var result = await controller.GetById(
            createdResponse.BookingId,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<BookingResponse>(ok.Value);
        Assert.Equal(createdResponse, response);
    }

    [Fact]
    public async Task GetById_CancelledBooking_ReturnsCancellationDetails()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var cancelledAtUtc = UtcDateTime(9, 5);
        var booking = new Booking
        {
            AppointmentSlotId = slot.AppointmentSlotId,
            Patient = new Patient
            {
                Reference = "PAT-001",
                DisplayName = "Alex Morgan"
            },
            Status = BookingStatus.Cancelled,
            BookedAtUtc = UtcDateTime(9, 1),
            CancelledAtUtc = cancelledAtUtc
        };
        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
        var controller = CreateController(dbContext);

        var result = await controller.GetById(
            booking.BookingId,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<BookingResponse>(ok.Value);
        Assert.Equal("Cancelled", response.Status);
        Assert.Equal(cancelledAtUtc, response.CancelledAtUtc);
        Assert.Equal("PAT-001", response.PatientReference);
    }

    [Fact]
    public async Task GetById_MissingBooking_ReturnsNotFound()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.GetById(999, CancellationToken.None);

        var notFound = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal("Booking not found", problem.Title);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetById_InvalidBookingId_ReturnsBadRequest(int bookingId)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.GetById(
            bookingId,
            CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal("Invalid booking identifier", problem.Title);
    }

    [Fact]
    public async Task Cancel_ActiveFutureBooking_CancelsAndReleasesSlot()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var controller = CreateController(dbContext);
        var createResult = await controller.Create(
            new CreateBookingRequest(
                slot.AppointmentSlotId,
                "PAT-001",
                "Alex Morgan"),
            CancellationToken.None);
        var created = Assert.IsType<CreatedResult>(createResult.Result);
        var createdResponse = Assert.IsType<BookingResponse>(created.Value);
        dbContext.ChangeTracker.Clear();

        var cancelResult = await controller.Cancel(
            createdResponse.BookingId,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(cancelResult.Result);
        var cancelledResponse = Assert.IsType<BookingResponse>(ok.Value);
        Assert.Equal("Cancelled", cancelledResponse.Status);
        Assert.Equal(UtcNow, cancelledResponse.CancelledAtUtc);

        dbContext.ChangeTracker.Clear();
        var persistedBooking = await dbContext.Bookings
            .AsNoTracking()
            .SingleAsync(item => item.BookingId == createdResponse.BookingId);
        Assert.Equal(BookingStatus.Cancelled, persistedBooking.Status);
        Assert.Equal(UtcNow, persistedBooking.CancelledAtUtc);

        var replacementResult = await controller.Create(
            new CreateBookingRequest(
                slot.AppointmentSlotId,
                "PAT-002",
                "Sam Taylor"),
            CancellationToken.None);

        Assert.IsType<CreatedResult>(replacementResult.Result);
        Assert.Equal(
            1,
            await dbContext.Bookings.CountAsync(
                item => item.Status == BookingStatus.Active));
        Assert.Equal(
            1,
            await dbContext.Bookings.CountAsync(
                item => item.Status == BookingStatus.Cancelled));
    }

    [Fact]
    public async Task Cancel_AlreadyCancelledBooking_ReturnsConflict()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 9, minute: 10);
        var controller = CreateController(dbContext);
        var createResult = await controller.Create(
            new CreateBookingRequest(
                slot.AppointmentSlotId,
                "PAT-001",
                "Alex Morgan"),
            CancellationToken.None);
        var created = Assert.IsType<CreatedResult>(createResult.Result);
        var createdResponse = Assert.IsType<BookingResponse>(created.Value);
        var firstCancellation = await controller.Cancel(
            createdResponse.BookingId,
            CancellationToken.None);
        Assert.IsType<OkObjectResult>(firstCancellation.Result);
        dbContext.ChangeTracker.Clear();

        var result = await controller.Cancel(
            createdResponse.BookingId,
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Contains("already been cancelled", problem.Detail);
    }

    [Fact]
    public async Task Cancel_StartedAppointment_ReturnsConflictAndRemainsActive()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext, clinicianId: 1, hour: 8, minute: 50);
        var booking = new Booking
        {
            AppointmentSlotId = slot.AppointmentSlotId,
            Patient = new Patient
            {
                Reference = "PAT-001",
                DisplayName = "Alex Morgan"
            },
            BookedAtUtc = UtcDateTime(8, 40)
        };
        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();
        var controller = CreateController(dbContext);

        var result = await controller.Cancel(
            booking.BookingId,
            CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        var persistedBooking = await dbContext.Bookings
            .AsNoTracking()
            .SingleAsync(item => item.BookingId == booking.BookingId);
        Assert.Equal(BookingStatus.Active, persistedBooking.Status);
        Assert.Null(persistedBooking.CancelledAtUtc);
    }

    [Fact]
    public async Task Cancel_MissingBooking_ReturnsNotFound()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.Cancel(999, CancellationToken.None);

        var notFound = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal("Booking not found", problem.Title);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Cancel_InvalidBookingId_ReturnsBadRequest(int bookingId)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var controller = CreateController(dbContext);

        var result = await controller.Cancel(
            bookingId,
            CancellationToken.None);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal("Invalid booking identifier", problem.Title);
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
