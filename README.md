# TM470 GP Appointment Scheduling Proof of Concept

This application allows patients to view, book and cancel GP appointments while surgery staff manage clinician availability and unavailable periods.

## Project aim

The project implements a small proof-of-concept appointment scheduling system for general practice.

It demonstrates how surgery staff-defined clinician availability can be translated into patient-facing appointment slots that can be viewed, booked and cancelled.

The main technical concern is booking integrity, particularly preventing more than one active booking for the same appointment slot.

## Implemented functions

### Patient functions

- View available appointment slots
- Review and book an available slot
- Retrieve a booking using its public booking reference
- Review and confirm a cancellation
- Receive confirmation and error feedback

### Surgery staff functions

- Create clinician availability sessions and generate appointment slots
- Block unavailable periods
- View and filter bookings by clinician, appointment date and status

## Technical stack

- React, TypeScript and Vite frontend using NHS.UK Frontend
- ASP.NET Core Web API with OpenAPI and Swagger UI
- Entity Framework Core with SQLite
- xUnit and Vitest automated tests
- Playwright end-to-end tests with axe accessibility checks
- GitHub Actions continuous integration with linting and test-coverage gates

## Project boundaries

The proof of concept:

- uses synthetic data only;
- does not use real patient or clinical data;
- does not authenticate users or enforce role-based access;
- does not connect to NHS systems;
- does not provide clinical triage or medical advice;
- does not use AI to prioritise patients;
- is not intended as a production NHS system.

## Run locally

### Prerequisites

- .NET SDK 10.0.302 or a compatible later patch from the 10.0 feature band
- Node.js 22.12 or later in the 22.x release line

For a first-time setup, restore the pinned tools and locked dependencies,
create the development database, and install the frontend dependencies:

```powershell
dotnet tool restore
dotnet restore AppointmentScheduling.sln --locked-mode
dotnet ef database update --project server/AppointmentScheduling.Api --startup-project server/AppointmentScheduling.Api
cd client/AppointmentScheduling.Web
npm ci
cd ../..
```

### Start the application

Start the API from the repository root:

```powershell
dotnet run --project server/AppointmentScheduling.Api --launch-profile http
```

In a second terminal, start the client:

```powershell
cd client/AppointmentScheduling.Web
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

GitHub Actions checks pull requests and changes to `main` for locked dependencies, formatting, analyser warnings, npm vulnerabilities, linting, Release builds, automated tests and at least 80% backend and frontend coverage. It also runs the Playwright journeys across Chromium, Firefox and WebKit.

### Available local checks

Run the backend tests from the repository root:

```powershell
dotnet test AppointmentScheduling.sln
```

Run the frontend checks from its project directory:

```powershell
cd client/AppointmentScheduling.Web
npm run lint
npm run build
npm run test
npm run test:coverage
```

Install the supported Playwright browsers once:

```powershell
npx playwright install chromium firefox webkit
```

Run Playwright commands from `client/AppointmentScheduling.Web`:

| Command | Purpose |
| --- | --- |
| `npm run test:e2e` | Run the complete suite headlessly |
| `npm run test:e2e:headed` | Run the suite in visible browsers |
| `npm run test:e2e:ui` | Open Playwright's interactive test runner |
| `npm run test:e2e:accessibility` | Run keyboard and automated accessibility checks |
| `npm run test:e2e:responsive` | Run the mobile patient and staff journeys |
| `npm run test:e2e:reflow` | Check desktop reflow at 320 CSS pixels |
| `npm run test:e2e:browsers` | Run the compatibility journey in all supported browsers |

Playwright uses dedicated test ports and a disposable SQLite database, leaving the development database unchanged.
