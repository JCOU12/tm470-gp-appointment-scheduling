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

- React and TypeScript frontend using the NHS.UK frontend design system library
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

The API currently supports clinician data, validated availability sessions, unavailable periods, generated appointment slots, transactional booking creation, public booking references, booking retrieval, cancellation and staff booking queries. The React interface presents patient and staff tasks as focused, route-based journeys with review or confirmation steps. Staff can create availability, add unavailable periods and filter booking records on separate pages. Its shared layout, forms, feedback and content components follow NHS.UK frontend patterns. The automated suites cover backend domain, persistence, controller and concurrency behaviour alongside patient and staff frontend workflows.

## Run locally

Start the API from the repository root:

```powershell
dotnet run --project server/AppointmentScheduling.Api --launch-profile http
```

In a second terminal, install and start the client:

```powershell
cd client/AppointmentScheduling.Web
npm install
npm run dev
```

The development client proxies `/api` requests to `http://localhost:5260`.

The patient appointment service is available at `http://localhost:5173/`. The staff scheduling service is available at `http://localhost:5173/staff`.

Interactive API documentation is available in Development at:

```text
http://localhost:5260/swagger
```

Swagger UI groups the patient and staff endpoints and can send test requests directly to the running API. The underlying OpenAPI document remains available at `http://localhost:5260/openapi/v1.json`.

### Reset the database

To start with a fresh database when one already exists, stop the API and run these commands from the repository root:

```powershell
cd server/AppointmentScheduling.Api
dotnet ef database drop --force
dotnet ef database update
```

This removes the existing data, recreates the database from the migrations and restores the seeded data.

## Quality checks

Pull requests and changes to `main` must pass the GitHub Actions CI workflow. It verifies locked dependency restoration, formatting and built-in .NET analyser rules, a warning-free Release build, all automated tests, and at least 80% application line coverage.

The frontend CI job installs locked npm dependencies, audits production dependencies, runs ESLint, creates a production build and requires at least 80% statement, branch, function and line coverage. After the backend and frontend quality jobs pass, Playwright runs the principal patient and staff journeys in Chromium against the real API and a disposable SQLite database.

Run the equivalent checks locally with:

```powershell
dotnet tool restore
dotnet restore AppointmentScheduling.sln --locked-mode
dotnet format AppointmentScheduling.sln --verify-no-changes --no-restore --severity warn --exclude server/AppointmentScheduling.Api/Data/Migrations
dotnet build AppointmentScheduling.sln --configuration Release --no-restore --warnaserror
dotnet test AppointmentScheduling.sln --configuration Release --no-build --settings coverlet.runsettings --collect:"XPlat Code Coverage" --results-directory artefacts/test-results
powershell -NoProfile -ExecutionPolicy Bypass -File ./eng/Assert-CodeCoverage.ps1 -CoverageDirectory artefacts/test-results -MinimumLineCoverage 80
```

From the repository root, change into the directory that contains the frontend `package.json`, then run the frontend checks:

```powershell
cd client/AppointmentScheduling.Web
npm ci
npm audit --audit-level=high
npm run lint
npm run build
npm run test:coverage
```

The preceding `dotnet tool restore` command installs the repository's pinned EF Core command-line tool, which Playwright uses to prepare its database. Run the end-to-end tests from `client/AppointmentScheduling.Web` in the normal headless mode with:

```powershell
npx playwright install chromium
npm run test:e2e
```

To watch the tests run in a visible browser, use headed mode:

```powershell
npm run test:e2e:headed
```

For Playwright's interactive test runner, use UI mode:

```powershell
npm run test:e2e:ui
```

The end-to-end configuration starts the API and client on dedicated test ports, uses a separate `E2E` .NET build configuration and resets only `appointment-scheduling-e2e.db`. It therefore does not interfere with a development server or change the normal development database. The suite uses page objects and custom Playwright fixtures to keep user-facing locators and reusable page actions separate from the journey assertions.
