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
builder.Services.AddSingleton<BookingReferenceGenerator>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<AvailabilitySessionService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<SchedulingService>();
builder.Services.AddScoped<StaffBookingQueryService>();
builder.Services.AddScoped<UnavailablePeriodService>();

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info.Title = "GP Appointment Scheduling API";
        document.Info.Version = "v1";
        document.Info.Description =
            "Interactive API documentation for patient appointment and staff scheduling operations.";

        return Task.CompletedTask;
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/openapi/v1.json",
            "GP Appointment Scheduling API v1");
        options.DocumentTitle = "GP Appointment Scheduling API";
        options.EnableDeepLinking();
        options.EnableTryItOutByDefault();
        options.DisplayRequestDuration();
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.MapControllers();

app.Run();

public partial class Program;
