using AppointmentScheduling.Api.Contracts.Bookings;
using AppointmentScheduling.Api.Controllers;
using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using AppointmentScheduling.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class BookingConcurrencyTests
{
    private static readonly DateTime UtcNow =
        new(2026, 8, 17, 9, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Create_CompetingRequests_OnlyOneBooksSlot()
    {
        var databasePath = Path.Combine(
            Path.GetTempPath(),
            $"appointment-scheduling-{Guid.NewGuid():N}.db");
        var connectionString = $"Data Source={databasePath};Pooling=False";

        try
        {
            var slotId = await CreateDatabaseAndSlotAsync(connectionString);

            await using var firstContext = CreateContext(connectionString);
            await using var secondContext = CreateContext(connectionString);
            var firstController = CreateController(firstContext);
            var secondController = CreateController(secondContext);
            var startGate = new TaskCompletionSource(
                TaskCreationOptions.RunContinuationsAsynchronously);

            var firstRequest = SubmitAfterStartAsync(
                firstController,
                new CreateBookingRequest(slotId, "Alex"),
                startGate.Task);
            var secondRequest = SubmitAfterStartAsync(
                secondController,
                new CreateBookingRequest(slotId, "Sam"),
                startGate.Task);

            startGate.SetResult();
            var results = await Task.WhenAll(firstRequest, secondRequest);

            Assert.Equal(
                [StatusCodes.Status201Created, StatusCodes.Status409Conflict],
                results.Select(GetStatusCode).Order().ToArray());

            await using var verificationContext = CreateContext(connectionString);
            Assert.Equal(
                1,
                await verificationContext.Bookings.CountAsync(
                    booking => booking.Status == BookingStatus.Active));
            Assert.Equal(1, await verificationContext.Patients.CountAsync());
        }
        finally
        {
            File.Delete(databasePath);
        }
    }

    private static int GetStatusCode(ActionResult<BookingResponse> result)
    {
        return Assert.IsAssignableFrom<IActionResult>(result.Result) switch
        {
            CreatedResult created => created.StatusCode
                ?? StatusCodes.Status201Created,
            ObjectResult problem => problem.StatusCode
                ?? throw new InvalidOperationException("The response has no status code."),
            var response => throw new InvalidOperationException(
                $"Unexpected response type {response.GetType().Name}.")
        };
    }

    private static BookingsController CreateController(
        AppointmentDbContext dbContext)
    {
        return new BookingsController(
            new BookingService(
                dbContext,
                new BookingReferenceGenerator(),
                new FixedTimeProvider(UtcNow)));
    }

    private static async Task<ActionResult<BookingResponse>> SubmitAfterStartAsync(
        BookingsController controller,
        CreateBookingRequest request,
        Task startSignal)
    {
        await startSignal;
        return await controller.Create(request, CancellationToken.None);
    }

    private static AppointmentDbContext CreateContext(
        string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppointmentDbContext>()
            .UseSqlite(connectionString)
            .Options;

        return new AppointmentDbContext(options);
    }

    private static async Task<int> CreateDatabaseAndSlotAsync(
        string connectionString)
    {
        await using var dbContext = CreateContext(connectionString);
        await dbContext.Database.MigrateAsync();

        var session = new AvailabilitySession
        {
            ClinicianId = 1,
            StartsAtUtc = UtcNow.AddMinutes(10),
            EndsAtUtc = UtcNow.AddMinutes(20),
            SlotDurationMinutes = 10
        };
        var slot = new AppointmentSlot
        {
            StartsAtUtc = UtcNow.AddMinutes(10),
            EndsAtUtc = UtcNow.AddMinutes(20)
        };
        session.AppointmentSlots.Add(slot);
        dbContext.AvailabilitySessions.Add(session);
        await dbContext.SaveChangesAsync();

        return slot.AppointmentSlotId;
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
