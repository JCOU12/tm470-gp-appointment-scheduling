using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AppointmentScheduling.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeedInitialClinicians : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Clinicians",
                columns: new[] { "ClinicianId", "IsActive", "Name", "Role" },
                values: new object[,]
                {
                    { 1, true, "Dr Maya Patel", "General Practitioner" },
                    { 2, true, "Dr Daniel Brooks", "General Practitioner" }
                });

            migrationBuilder.InsertData(
                table: "Clinicians",
                columns: new[] { "ClinicianId", "IsActive", "Name", "Role" },
                values: new object[] { 3, false, "Dr Sofia Ahmed", "General Practitioner" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Clinicians",
                keyColumn: "ClinicianId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Clinicians",
                keyColumn: "ClinicianId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Clinicians",
                keyColumn: "ClinicianId",
                keyValue: 3);
        }
    }
}
