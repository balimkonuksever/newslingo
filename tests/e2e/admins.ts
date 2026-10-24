// The test admins the global setup creates, one per Playwright project.

export const E2E_ADMINS_VARIABLE = "E2E_ADMINS";

export type TestAdmin = {
  name: string;
  email: string;
  password: string;
  setupKey: string;
  backupCodes: string[];
};

export function testAdminFor(project: string): TestAdmin {
  const admins = JSON.parse(process.env[E2E_ADMINS_VARIABLE] ?? "{}") as Record<
    string,
    TestAdmin
  >;
  const admin = admins[project];

  if (!admin) {
    throw new Error(`The global setup made no test admin for "${project}".`);
  }

  return admin;
}
