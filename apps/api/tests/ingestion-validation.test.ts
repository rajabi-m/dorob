import { describe, expect, test } from "bun:test";
import type { CourseIngestion } from "@dorob/core";
import { factHash, requestHash, validateIngestion } from "../src/ingestion-validation";

import { minimal, rich } from "../src/ingestion-examples";
export { minimal, rich } from "../src/ingestion-examples";

describe("v3 source boundary", () => {
  test("sparse and rich retain nulls, offers and anonymous facts", () => {
    expect(validateIngestion(minimal())).toEqual(minimal()); expect(validateIngestion(rich())).toEqual(rich());
  });
  test("request includes provenance; fact hash excludes timestamps and transport", () => {
    const a = rich(), b = rich(); b.submissionId = "later"; b.source.checkedAt = "2026-10-11T00:00:00Z"; b.source.extractorVersion = "2";
    expect(requestHash(a)).not.toBe(requestHash(b)); expect(factHash(a)).toBe(factHash(b));
    b.pricing.data!.reverse(); expect(factHash(a)).not.toBe(factHash(b));
    expect(requestHash(a)).toBe(requestHash(JSON.parse(JSON.stringify(a))));
  });
  test("reject invalid nested data under every coverage status", () => {
    for (const status of ["complete", "partial", "unknown", "failed"] as const) {
      const a = rich(); a.education!.coverage.status = status; a.education!.data!.duration.contentMinutes = -1;
      expect(() => validateIngestion(a)).toThrow();
    }
  });
  test("unknown is not free; free and currency need evidence", () => {
    for (const edit of [(a: CourseIngestion) => { a.pricing.data![1].amount = 0; }, (a: CourseIngestion) => { a.pricing.data![1].sourcePrice.unit = "unknown"; }, (a: CourseIngestion) => { delete a.source.fieldSources["pricing.data.0.status"]; }]) {
      const a = rich(); edit(a); expect(() => validateIngestion(a)).toThrow();
    }
  });
  test("omitted, failed, null, partial and confirmed empty are distinct", () => {
    const a = minimal(); a.curriculum = { coverage: { status: "failed", reason: "Access denied" }, data: null }; expect(validateIngestion(a)).toEqual(a);
    a.instructors = { coverage: { status: "unknown", reason: "Unverified" }, data: [] }; expect(() => validateIngestion(a)).toThrow();
    a.instructors.coverage = { status: "complete", reason: null }; a.source.fieldSources["instructors.data"] = "explicit no instructors"; expect(validateIngestion(a)).toEqual(a);
    delete a.source.fieldSources["title"]; expect(() => validateIngestion(a)).toThrow();
  });
  test("unknown fields, reviewer identities, contact data and unsafe extensions rejected", () => {
    const a = rich(); expect(() => validateIngestion({ ...a, derived: {} })).toThrow();
    a.feedback!.data!.reviews.items![0].text = "email a@example.org"; expect(() => validateIngestion(a)).toThrow();
    const b = rich(); Object.assign(b.feedback!.data!.reviews.items![0], { author: "name" }); expect(() => validateIngestion(b)).toThrow();
    const c = minimal(); c.providerData = { coverage: { status: "unknown", reason: "selected" }, data: { "example.course": { author: "name" } } }; expect(() => validateIngestion(c)).toThrow();
    c.providerData.data = { "example.course": { safe: "a".repeat(66000) } }; expect(() => validateIngestion(c)).toThrow();
  });
});
