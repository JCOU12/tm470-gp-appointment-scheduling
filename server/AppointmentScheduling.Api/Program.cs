using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppointmentDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("AppointmentDatabase")
        ?? throw new InvalidOperationException(
            "Connection string 'AppointmentDatabase' was not found.")));

builder.Services.AddSingleton<AppointmentSlotGenerator>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<AvailabilitySessionService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<SchedulingService>();
builder.Services.AddScoped<StaffBookingQueryService>();
builder.Services.AddScoped<UnavailablePeriodService>();

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
