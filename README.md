# TM470 GP Appointment Scheduling Proof of Concept

This repository contains the practical output for my TM470 Computing and IT project.

## Project aim

The project designs, implements and evaluates a small proof-of-concept appointment scheduling system for general practice.

It demonstrates how surgery staff-defined clinician availability can be translated into patient-facing appointment slots that can be viewed, booked and cancelled.

The main technical concern is booking integrity, particularly preventing more than one active booking for the same appointment slot.

## Planned functions

### Patient functions

- View available appointment slots
- Book an available slot
- View a booking
- Cancel a booking
- Receive confirmation and error feedback

### Surgery staff functions

- Create clinician availability sessions
- Block unavailable periods
- View booking information

## Technical stack

- React and TypeScript frontend
- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- xUnit automated tests

## Project boundaries

The proof of concept:

- uses synthetic data only;
- does not use real patient or clinical data;
- does not connect to NHS systems;
- does not provide clinical triage or medical advice;
- does not use AI to prioritise patients;
- is not intended as a production NHS system.

## Current status

The API currently supports clinician data, validated availability sessions, generated appointment slots and transactional booking creation. The automated suite covers domain, persistence, controller and competing-booking behaviour.

## Quality checks

Pull requests and changes to `main` must pass the GitHub Actions CI workflow. It verifies locked dependency restoration, formatting and built-in .NET analyzer rules, a warning-free Release build, all automated tests, and at least 80% application line coverage.

Run the equivalent checks locally with:

```powershell
dotnet restore AppointmentScheduling.sln --locked-mode
dotnet format AppointmentScheduling.sln --verify-no-changes --no-restore --severity warn --exclude server/AppointmentScheduling.Api/Data/Migrations
dotnet build AppointmentScheduling.sln --configuration Release --no-restore --warnaserror
dotnet test AppointmentScheduling.sln --configuration Release --no-build --settings coverlet.runsettings --collect:"XPlat Code Coverage" --results-directory artifacts/test-results
powershell -NoProfile -ExecutionPolicy Bypass -File ./eng/Assert-CodeCoverage.ps1 -CoverageDirectory artifacts/test-results -MinimumLineCoverage 80
```
