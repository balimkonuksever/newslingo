import { describe, expect, it } from "vitest";

import {
  assertDemoSeedAllowed,
  parsePostgresUrl,
  requireSiteDatabaseUrl,
  requireTestDatabaseUrl,
  validateTestDatabaseUrls,
} from "./database-env";

describe("parsePostgresUrl", () => {
  it("accepts PostgreSQL connection URLs", () => {
    const url =
      "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo?schema=public";

    expect(parsePostgresUrl("DATABASE_URL", url)).toBe(url);
  });

  it("rejects non-PostgreSQL protocols", () => {
    expect(() =>
      parsePostgresUrl("DATABASE_URL", "https://localhost/newslingo"),
    ).toThrow("must use the postgresql:// or postgres:// protocol");
  });

  it("rejects URLs without a database name", () => {
    expect(() =>
      parsePostgresUrl(
        "DATABASE_URL",
        "postgresql://newslingo:local-only@127.0.0.1:5432",
      ),
    ).toThrow("must include a database name");
  });
});

describe("validateTestDatabaseUrls", () => {
  const databaseUrl =
    "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo?schema=public";

  it("accepts a separately named test database", () => {
    const testDatabaseUrl =
      "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo_test?schema=public";

    expect(validateTestDatabaseUrls({ databaseUrl, testDatabaseUrl })).toEqual({
      TEST_DATABASE_URL: testDatabaseUrl,
    });
  });

  it("rejects names where test is only part of another word", () => {
    expect(() =>
      validateTestDatabaseUrls({
        databaseUrl,
        testDatabaseUrl:
          "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo_contest?schema=public",
      }),
    ).toThrow("must identify a database with a distinct `test` name token");
  });

  it("rejects the application database even when credentials and query parameters differ", () => {
    expect(() =>
      validateTestDatabaseUrls({
        databaseUrl,
        testDatabaseUrl:
          "postgresql://another-user:another-password@127.0.0.1:5432/newslingo?schema=test",
      }),
    ).toThrow("must not point to the application database");
  });
});

describe("requireTestDatabaseUrl", () => {
  it("accepts a URL whose database name has a test token", () => {
    const url =
      "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo_test?schema=public";

    expect(requireTestDatabaseUrl("DATABASE_URL", url)).toBe(url);
  });

  it("rejects the development database and names the variable", () => {
    expect(() =>
      requireTestDatabaseUrl(
        "DATABASE_URL",
        "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo?schema=test",
      ),
    ).toThrow(
      "DATABASE_URL must identify a database with a distinct `test` name token",
    );
  });
});

describe("requireSiteDatabaseUrl", () => {
  it("accepts a database on this machine whose name has a site token", () => {
    const url =
      "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo_site?schema=public";

    expect(requireSiteDatabaseUrl(url)).toBe(url);
  });

  it.each([
    [
      "the development database",
      "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo",
      "a distinct `site` name token",
    ],
    [
      "a name that only contains the word",
      "postgresql://newslingo:local-only@127.0.0.1:5432/website",
      "a distinct `site` name token",
    ],
    [
      "a database on another machine",
      "postgresql://newslingo:secret@db.example.com:5432/newslingo_site",
      "a database on this machine",
    ],
  ])("refuses %s", (_name, url, message) => {
    expect(() => requireSiteDatabaseUrl(url)).toThrow(message);
  });
});

describe("assertDemoSeedAllowed", () => {
  it.each([
    "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo",
    "postgresql://newslingo:local-only@localhost:5432/newslingo_test",
    "postgresql://newslingo:local-only@[::1]:5432/newslingo",
  ])("allows a local database: %s", (databaseUrl) => {
    expect(() =>
      assertDemoSeedAllowed({ nodeEnv: "development", databaseUrl }),
    ).not.toThrow();
    expect(() =>
      assertDemoSeedAllowed({ nodeEnv: undefined, databaseUrl }),
    ).not.toThrow();
  });

  it("refuses when NODE_ENV is production, even for a local database", () => {
    expect(() =>
      assertDemoSeedAllowed({
        nodeEnv: "production",
        databaseUrl:
          "postgresql://newslingo:local-only@127.0.0.1:5432/newslingo",
      }),
    ).toThrow("NODE_ENV is production");
  });

  it("refuses a database on another host", () => {
    expect(() =>
      assertDemoSeedAllowed({
        nodeEnv: "development",
        databaseUrl: "postgresql://app:secret@db.example.com:5432/newslingo",
      }),
    ).toThrow('non-local database (host "db.example.com")');
  });
});
