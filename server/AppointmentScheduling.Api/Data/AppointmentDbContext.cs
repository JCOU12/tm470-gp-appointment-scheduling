using AppointmentScheduling.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AppointmentScheduling.Api.Data;

public class AppointmentDbContext : DbContext
{
    private static readonly ValueConverter<DateTime, DateTime>
        UtcDateTimeConverter = new(
            value => value.ToUniversalTime(),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    public AppointmentDbContext(
        DbContextOptions<AppointmentDbContext> options)
        : base(options)
    {
    }

    public DbSet<Clinician> Clinicians => Set<Clinician>();

    public DbSet<AvailabilitySession> AvailabilitySessions =>
        Set<AvailabilitySession>();

    public DbSet<AppointmentSlot> AppointmentSlots => Set<AppointmentSlot>();

    public DbSet<UnavailablePeriod> UnavailablePeriods =>
        Set<UnavailablePeriod>();

    public DbSet<Patient> Patients => Set<Patient>();

    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Clinician>(entity =>
        {
            entity.HasKey(clinician => clinician.ClinicianId);

            entity.Property(clinician => clinician.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(clinician => clinician.Role)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(clinician => clinician.IsActive)
                .HasDefaultValue(true);

            entity.HasData(
                new Clinician
                {
                    ClinicianId = 1,
                    Name = "Dr Maya Patel",
                    Role = "General Practitioner",
                    IsActive = true
                },
                new Clinician
                {
                    ClinicianId = 2,
                    Name = "Dr Daniel Brooks",
                    Role = "General Practitioner",
                    IsActive = true
                },
                new Clinician
                {
                    ClinicianId = 3,
                    Name = "Dr Sofia Ahmed",
                    Role = "General Practitioner",
                    IsActive = false
                });
        });

        modelBuilder.Entity<AvailabilitySession>(entity =>
        {
            entity.HasKey(session => session.AvailabilitySessionId);

            entity.Property(session => session.StartsAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.Property(session => session.EndsAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.Property(session => session.SlotDurationMinutes)
                .IsRequired();

            entity.HasOne(session => session.Clinician)
                .WithMany(clinician => clinician.AvailabilitySessions)
                .HasForeignKey(session => session.ClinicianId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(session => new
            {
                session.ClinicianId,
                session.StartsAtUtc
            });

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_AvailabilitySessions_TimeRange",
                    "\"EndsAtUtc\" > \"StartsAtUtc\"");
                table.HasCheckConstraint(
                    "CK_AvailabilitySessions_SlotDurationMinutes",
                    "\"SlotDurationMinutes\" > 0");
            });
        });

        modelBuilder.Entity<AppointmentSlot>(entity =>
        {
            entity.HasKey(slot => slot.AppointmentSlotId);

            entity.Property(slot => slot.StartsAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.Property(slot => slot.EndsAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.HasOne(slot => slot.AvailabilitySession)
                .WithMany(session => session.AppointmentSlots)
                .HasForeignKey(slot => slot.AvailabilitySessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(slot => new
            {
                slot.AvailabilitySessionId,
                slot.StartsAtUtc
            })
                .IsUnique();

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_AppointmentSlots_TimeRange",
                    "\"EndsAtUtc\" > \"StartsAtUtc\"");
            });
        });

        modelBuilder.Entity<UnavailablePeriod>(entity =>
        {
            entity.HasKey(period => period.UnavailablePeriodId);

            entity.Property(period => period.StartsAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.Property(period => period.EndsAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.HasOne(period => period.Clinician)
                .WithMany(clinician => clinician.UnavailablePeriods)
                .HasForeignKey(period => period.ClinicianId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(period => new
            {
                period.ClinicianId,
                period.StartsAtUtc
            });

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_UnavailablePeriods_TimeRange",
                    "\"EndsAtUtc\" > \"StartsAtUtc\"");
            });
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(patient => patient.PatientId);

            entity.Property(patient => patient.DisplayName)
                .IsRequired()
                .HasMaxLength(100);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(booking => booking.BookingId);

            entity.Property(booking => booking.Reference)
                .IsRequired()
                .HasMaxLength(12);

            entity.Property(booking => booking.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(booking => booking.BookedAtUtc)
                .HasConversion(UtcDateTimeConverter)
                .IsRequired();

            entity.Property(booking => booking.CancelledAtUtc)
                .HasConversion(UtcDateTimeConverter);

            entity.HasOne(booking => booking.AppointmentSlot)
                .WithMany(slot => slot.Bookings)
                .HasForeignKey(booking => booking.AppointmentSlotId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(booking => booking.Patient)
                .WithMany(patient => patient.Bookings)
                .HasForeignKey(booking => booking.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(booking => booking.AppointmentSlotId)
                .IsUnique()
                .HasFilter("\"Status\" = 'Active'");

            entity.HasIndex(booking => booking.PatientId);

            entity.HasIndex(booking => booking.Reference)
                .IsUnique();

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_Bookings_Status",
                    "\"Status\" IN ('Active', 'Cancelled')");
                table.HasCheckConstraint(
                    "CK_Bookings_Cancellation",
                    "(\"Status\" = 'Active' AND \"CancelledAtUtc\" IS NULL) "
                    + "OR (\"Status\" = 'Cancelled' AND \"CancelledAtUtc\" IS NOT NULL)");
            });
        });
    }
}
