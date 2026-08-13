using AppointmentScheduling.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AppointmentScheduling.Api.Data;

public class AppointmentDbContext : DbContext
{
    public AppointmentDbContext(
        DbContextOptions<AppointmentDbContext> options)
        : base(options)
    {
    }

    public DbSet<Clinician> Clinicians => Set<Clinician>();

    public DbSet<AvailabilitySession> AvailabilitySessions =>
        Set<AvailabilitySession>();

    public DbSet<AppointmentSlot> AppointmentSlots => Set<AppointmentSlot>();

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
                .IsRequired();

            entity.Property(session => session.EndsAtUtc)
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
                .IsRequired();

            entity.Property(slot => slot.EndsAtUtc)
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
    }
}
