using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppointmentScheduling.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAvailabilityDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AvailabilitySessions",
                columns: table => new
                {
                    AvailabilitySessionId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ClinicianId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SlotDurationMinutes = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AvailabilitySessions", x => x.AvailabilitySessionId);
                    table.CheckConstraint("CK_AvailabilitySessions_SlotDurationMinutes", "\"SlotDurationMinutes\" > 0");
                    table.CheckConstraint("CK_AvailabilitySessions_TimeRange", "\"EndsAtUtc\" > \"StartsAtUtc\"");
                    table.ForeignKey(
                        name: "FK_AvailabilitySessions_Clinicians_ClinicianId",
                        column: x => x.ClinicianId,
                        principalTable: "Clinicians",
                        principalColumn: "ClinicianId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppointmentSlots",
                columns: table => new
                {
                    AppointmentSlotId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AvailabilitySessionId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentSlots", x => x.AppointmentSlotId);
                    table.CheckConstraint("CK_AppointmentSlots_TimeRange", "\"EndsAtUtc\" > \"StartsAtUtc\"");
                    table.ForeignKey(
                        name: "FK_AppointmentSlots_AvailabilitySessions_AvailabilitySessionId",
                        column: x => x.AvailabilitySessionId,
                        principalTable: "AvailabilitySessions",
                        principalColumn: "AvailabilitySessionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentSlots_AvailabilitySessionId_StartsAtUtc",
                table: "AppointmentSlots",
                columns: new[] { "AvailabilitySessionId", "StartsAtUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AvailabilitySessions_ClinicianId_StartsAtUtc",
                table: "AvailabilitySessions",
                columns: new[] { "ClinicianId", "StartsAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppointmentSlots");

            migrationBuilder.DropTable(
                name: "AvailabilitySessions");
        }
    }
}
