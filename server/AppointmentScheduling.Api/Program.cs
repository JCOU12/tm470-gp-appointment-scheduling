using AppointmentScheduling.Api.Data;
using AppointmentScheduling.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

builder.Services.AddDbContext<AppointmentDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("AppointmentDatabase")
        ?? throw new InvalidOperationException(
            "Connection string 'AppointmentDatabase' was not found.")));

builder.Services.AddSingleton<AppointmentSlotGenerator>();
builder.Services.AddScoped<AvailabilitySessionService>();

builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
