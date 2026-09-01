import { defineConfig, devices } from '@playwright/test'

const apiProject =
  '../../server/AppointmentScheduling.Api/AppointmentScheduling.Api.csproj'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/responsive\.spec\.ts/, /reflow\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 320, height: 720 },
      },
    },
    {
      name: 'desktop-reflow',
      testMatch: /reflow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 720 },
      },
    },
    {
      name: 'firefox',
      testMatch: /browser-compatibility\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /browser-compatibility\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command:
        `dotnet ef database drop --force --configuration E2E --project ${apiProject} --startup-project ${apiProject}`
        + ` && dotnet ef database update --configuration E2E --project ${apiProject} --startup-project ${apiProject}`
        + ` && dotnet run --configuration E2E --project ${apiProject} --no-launch-profile --urls http://127.0.0.1:5261`,
      url: 'http://127.0.0.1:5261/api/clinicians',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__AppointmentDatabase:
          'Data Source=appointment-scheduling-e2e.db',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174',
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        VITE_API_PROXY_TARGET: 'http://127.0.0.1:5261',
      },
    },
  ],
})
