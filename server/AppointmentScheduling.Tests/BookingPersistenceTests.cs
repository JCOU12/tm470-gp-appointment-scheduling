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
        var patient = CreatePatient("Alex Morgan");
        var bookedAtUtc = UtcDateTime(9, 1);
        dbContext.Bookings.Add(
            new Booking
            {
                Reference = "APT-2BCDEFGH",
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
        Assert.Equal("APT-2BCDEFGH", booking.Reference);
        Assert.Equal("Alex Morgan", booking.Patient.DisplayName);

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT Status FROM Bookings";
        Assert.Equal("Active", await command.ExecuteScalarAsync());
    }

    [Fact]
    public async Task Migration_UpgradesExistingBookingsWithPublicReferences()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppointmentDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppointmentDbContext(options);
        await dbContext.Database.MigrateAsync(
            "20260814215652_AddUnavailablePeriods");

        await using (var seedCommand = connection.CreateCommand())
        {
            seedCommand.CommandText =
                "INSERT INTO Patients (Reference, DisplayName) "
                + "VALUES ('PAT-001', 'Alex Morgan'); "
                + "INSERT INTO AvailabilitySessions "
                + "(ClinicianId, StartsAtUtc, EndsAtUtc, SlotDurationMinutes) "
                + "VALUES (1, '2026-08-27 09:00:00', "
                + "'2026-08-27 10:00:00', 10); "
                + "INSERT INTO AppointmentSlots "
                + "(AvailabilitySessionId, StartsAtUtc, EndsAtUtc) "
                + "VALUES (1, '2026-08-27 09:10:00', "
                + "'2026-08-27 09:20:00'); "
                + "INSERT INTO Bookings "
                + "(AppointmentSlotId, PatientId, Status, BookedAtUtc) "
                + "VALUES (1, 1, 'Active', '2026-08-26 09:00:00');";
            await seedCommand.ExecuteNonQueryAsync();
        }

        await dbContext.Database.MigrateAsync();
        dbContext.ChangeTracker.Clear();

        var booking = await dbContext.Bookings
            .AsNoTracking()
            .Include(item => item.Patient)
            .SingleAsync();
        Assert.Matches("^APT-[A-Z0-9]{8}$", booking.Reference);
        Assert.Equal("Alex Morgan", booking.Patient.DisplayName);

        await using var schemaCommand = connection.CreateCommand();
        schemaCommand.CommandText =
            "SELECT COUNT(*) FROM pragma_table_info('Patients') "
            + "WHERE name = 'Reference'";
        Assert.Equal(0L, await schemaCommand.ExecuteScalarAsync());
    }

    [Fact]
    public async Task DuplicateBookingReference_IsRejectedByDatabase()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var firstSlot = await CreateSlotAsync(dbContext);
        var secondSlot = await CreateSlotAsync(dbContext);
        dbContext.Bookings.Add(
            CreateBooking(
                "APT-2BCDEFGH",
                firstSlot.AppointmentSlotId,
                CreatePatient("Alex")));
        await dbContext.SaveChangesAsync();
        dbContext.Bookings.Add(
            CreateBooking(
                "APT-2BCDEFGH",
                secondSlot.AppointmentSlotId,
                CreatePatient("Sam")));

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    [Fact]
    public async Task SecondActiveBookingForSlot_IsRejectedByDatabase()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var dbContext = await CreateMigratedContextAsync(connection);
        var slot = await CreateSlotAsync(dbContext);
        dbContext.Bookings.Add(
            CreateBooking(
                "APT-2BCDEFGH",
                slot.AppointmentSlotId,
                CreatePatient("Alex")));
        await dbContext.SaveChangesAsync();
        dbContext.Bookings.Add(
            CreateBooking(
                "APT-3BCDEFGH",
                slot.AppointmentSlotId,
                CreatePatient("Sam")));

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
                Reference = "APT-2BCDEFGH",
                AppointmentSlotId = slot.AppointmentSlotId,
                Patient = CreatePatient("Alex"),
                Status = BookingStatus.Cancelled,
                BookedAtUtc = UtcDateTime(9, 1),
                CancelledAtUtc = UtcDateTime(9, 2)
            });
        dbContext.Bookings.Add(
            CreateBooking(
                "APT-3BCDEFGH",
                slot.AppointmentSlotId,
                CreatePatient("Sam")));

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
                Reference = "APT-2BCDEFGH",
                AppointmentSlotId = slot.AppointmentSlotId,
                Patient = CreatePatient("Alex"),
                Status = BookingStatus.Cancelled,
                BookedAtUtc = UtcDateTime(9, 1)
            });

        await Assert.ThrowsAsync<DbUpdateException>(
            () => dbContext.SaveChangesAsync());
    }

    private static Booking CreateBooking(
        string reference,
        int slotId,
        Patient patient)
    {
        return new Booking
        {
            Reference = reference,
            AppointmentSlotId = slotId,
            Patient = patient,
            BookedAtUtc = UtcDateTime(9, 1)
        };
    }

    private static Patient CreatePatient(string displayName)
    {
        return new Patient
        {
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
