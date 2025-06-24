import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // This will now also run generated_tests.spec.ts
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // screenshot: 'on', // These are inherited from `use` above, no need to repeat
        // video: 'on',
        // trace: 'on',
      },
    },
  ],
});