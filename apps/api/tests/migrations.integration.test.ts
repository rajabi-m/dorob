import { describe, expect, test } from "bun:test";
import { categoryRegistry } from "@dorob/core";
import { isolatedDatabase } from "./helpers";
import { migrate, readMigrations } from "../src/migrations";

async function rejected(work: PromiseLike<unknown>) {
  let failed = false;
  try { await work; } catch { failed = true; }
  expect(failed).toBe(true);
}


describe.skipIf(process.env.API_INTEGRATION !== "1")("catalog migrations", () => {
  test("initial, rerun, concurrency, checksum drift and transactional rollback", async () => {
    await isolatedDatabase(async sql => {
      const migrations = await readMigrations();
      await Promise.all([migrate(sql, migrations), migrate(sql, migrations)]);
      expect((await sql`SELECT count(*)::int AS n FROM schema_migrations`)[0].n).toBe(1);
      await sql`INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) VALUES ('test:1','test','1','نمونه','https://example.com/1')`;
      await migrate(sql, migrations);
      expect((await sql`SELECT id FROM courses`)[0].id).toBe("test:1");
      await expect(migrate(sql, [{ ...migrations[0], source: migrations[0].source + "\n-- drift" }])).rejects.toThrow("checksum");
      await rejected(migrate(sql, [...migrations, { version: "002_failure.sql", source: "CREATE TABLE failed_write(id int); SELECT 1/0;" }]));
      expect((await sql`SELECT to_regclass('failed_write') AS name`)[0].name).toBeNull();
      expect((await sql`SELECT count(*)::int AS n FROM schema_migrations`)[0].n).toBe(1);
    });
  });
  test("category parity and relational constraints reject invalid writes", async () => {
    await isolatedDatabase(async sql => {
      await migrate(sql, await readMigrations());
      for (const category of categoryRegistry) {
        await sql`INSERT INTO course_groups(slug,title,description,category_id) VALUES (${category.id},'عنوان','شرح',${category.id})`;
      }
      expect((await sql`SELECT count(*)::int AS n FROM course_groups`)[0].n).toBe(6);
      await rejected(sql`INSERT INTO course_groups(slug,title,description,category_id) VALUES ('invalid','عنوان','شرح','invalid')`);
      await rejected(sql`INSERT INTO course_groups(slug,title,description,category_id) VALUES ('code','عنوان','شرح','code')`);
      await rejected(sql`UPDATE course_groups SET target_level='unsupported' WHERE slug='code'`);
      await sql`INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) VALUES ('test:1','test','1','نمونه','https://example.com')`;
      await rejected(sql`INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) VALUES ('other','test','1','نمونه','https://example.com')`);
      const group = (await sql`SELECT id FROM course_groups WHERE slug='code'`)[0];
      await rejected(sql`INSERT INTO course_group_courses(group_id,course_id) VALUES (${group.id},'missing')`);
      await sql`INSERT INTO course_group_courses(group_id,course_id) VALUES (${group.id},'test:1')`;
      await rejected(sql`INSERT INTO course_group_courses(group_id,course_id) VALUES (${group.id},'test:1')`);
    });
  });
});
