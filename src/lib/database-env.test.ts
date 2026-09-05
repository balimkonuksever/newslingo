import { describe, expect, it } from "vitest";

import { parsePostgresUrl, validateTestDatabaseUrls } from "./database-env";

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
