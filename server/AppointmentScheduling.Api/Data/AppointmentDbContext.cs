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
        });
    }
}