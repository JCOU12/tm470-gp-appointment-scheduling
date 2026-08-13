using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Tests;

public sealed class BookingPersistenceTests
{
    [Fact]
    public async Task Migration_PersistsBookingRelationshipsAndStringStatus()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext);
        var patient = CreatePatient("PAT-001", "Alex Morgan");
        var bookedAtUtc = UtcDateTime(9, 1);
        dbContext.Bookings.Add(
            new Booking
            {
                AppointmentSlotId = slot.AppointmentSlotId,
                Patient = patient,
                BookedAtUtc = bookedAtUtc
            });

        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        var booking = await dbContext.Bookings
            .AsNoTracking()
            .Include(item => item.AppointmentSlot)
            .Include(item => item.Patient)
            .SingleAsync();

        Assert.Equal(BookingStatus.Active, booking.Status);
        Assert.Equal(bookedAtUtc, booking.BookedAtUtc);
        Assert.Null(booking.CancelledAtUtc);
        Assert.Equal(slot.AppointmentSlotId, booking.AppointmentSlotId);
        Assert.Equal("PAT-001", booking.Patient.Reference);

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT Status FROM Bookings";
        Assert.Equal("Active", await command.ExecuteScalarAsync());
    }

    [Fact]
    public async Task SecondActiveBookingForSlot_IsRejectedByDatabase()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext);
        dbContext.Bookings.Add(
            CreateBooking(slot.AppointmentSlotId, CreatePatient("PAT-001", "Alex")));
        await dbContext.SaveChangesAsync();
        dbContext.Bookings.Add(
            CreateBooking(slot.AppointmentSlotId, CreatePatient("PAT-002", "Sam")));

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    [Fact]
    public async Task CancelledBooking_AllowsLaterActiveBookingForSameSlot()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext);
        dbContext.Bookings.Add(
            new Booking
            {
                AppointmentSlotId = slot.AppointmentSlotId,
                Patient = CreatePatient("PAT-001", "Alex"),
                Status = BookingStatus.Cancelled,
                BookedAtUtc = UtcDateTime(9, 1),
                CancelledAtUtc = UtcDateTime(9, 2)
            });
        dbContext.Bookings.Add(
            CreateBooking(slot.AppointmentSlotId, CreatePatient("PAT-002", "Sam")));

        await dbContext.SaveChangesAsync();

        Assert.Equal(2, await dbContext.Bookings.CountAsync());
        Assert.Equal(
            1,
            await dbContext.Bookings.CountAsync(
                booking => booking.Status == BookingStatus.Active));
    }

    [Fact]
    public async Task CancelledBookingWithoutCancellationTime_IsRejected()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext);
        dbContext.Bookings.Add(
            new Booking
            {
                AppointmentSlotId = slot.AppointmentSlotId,
                Patient = CreatePatient("PAT-001", "Alex"),
                Status = BookingStatus.Cancelled,
                BookedAtUtc = UtcDateTime(9, 1)
            });

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    private static Booking CreateBooking(int slotId, Patient patient)
    {
        return new Booking
        {
            AppointmentSlotId = slotId,
            Patient = patient,
            BookedAtUtc = UtcDateTime(9, 1)
        };
    }

    private static Patient CreatePatient(string reference, string displayName)
    {
        return new Patient
        {
            Reference = reference,
            DisplayName = displayName
        };
    }

    private static async Task<AppointmentSlot> CreateSlotAsync(
        AppointmentDbContext dbContext)
    {
        var session = new AvailabilitySession
        {
            ClinicianId = 1,
            StartsAtUtc = UtcDateTime(9, 0),
            EndsAtUtc = UtcDateTime(10, 0),
            SlotDurationMinutes = 10
        };
        var slot = new AppointmentSlot
        {
            StartsAtUtc = UtcDateTime(9, 10),
            EndsAtUtc = UtcDateTime(9, 20)
        };
        session.AppointmentSlots.Add(slot);
        dbContext.AvailabilitySessions.Add(session);
        await dbContext.SaveChangesAsync();

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
}
