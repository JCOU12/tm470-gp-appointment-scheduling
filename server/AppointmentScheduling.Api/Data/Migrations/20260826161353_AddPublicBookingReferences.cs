using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppointmentScheduling.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicBookingReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Reference",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "Reference",
                table: "Patients");

            migrationBuilder.AddColumn<string>(
                name: "Reference",
                table: "Bookings",
                type: "TEXT",
                maxLength: 12,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"Bookings\" "
                + "SET \"Reference\" = 'APT-' || "
                + "substr(printf('%08X', \"BookingId\" * 2654435761), -8);");

            migrationBuilder.AlterColumn<string>(
                name: "Reference",
                table: "Bookings",
                type: "TEXT",
                maxLength: 12,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 12,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_Reference",
                table: "Bookings",
                column: "Reference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_Reference",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Reference",
                table: "Bookings");

            migrationBuilder.AddColumn<string>(
                name: "Reference",
                table: "Patients",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"Patients\" "
                + "SET \"Reference\" = 'PAT-' || printf('%08d', \"PatientId\");");

            migrationBuilder.AlterColumn<string>(
                name: "Reference",
                table: "Patients",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Reference",
                table: "Patients",
                column: "Reference",
                unique: true);
        }
    }
}
