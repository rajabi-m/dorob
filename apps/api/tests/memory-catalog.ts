import type { CourseGroup, CourseReference } from "@dorob/core";
import { CatalogError, type CatalogRepository } from "../src/catalog";

/** Offline repository double; production persistence is tested separately against PostgreSQL. */
export function memoryCatalog(): CatalogRepository {
  const courses = new Map<string, CourseReference>();
  const groups = new Map<string, CourseGroup>();
  const links = new Map<string, Set<string>>();
  const group = (id: string) => { const g = groups.get(id); if (!g) throw new CatalogError(404); return { ...g, courseCount: links.get(id)?.size ?? 0 }; };
  const paginate = <T>(items: T[], page: { limit: number; offset: number }) => ({ items: items.slice(page.offset, page.offset + page.limit), total: items.length, ...page });
  const eligible = (g: CourseGroup) => g.isPublished && g.courseCount >= 2;
  return {
    async registerCourse(input) {
      const id = `${input.providerId}:${input.providerCourseId}`;
      const created = !courses.has(id); const course = { id, ...input }; courses.set(id, course); return { course, created };
    },
    async listCourses(page) { return paginate([...courses.values()].sort((a,b) => a.id < b.id ? -1 : 1), page); },
    async createGroup(input) {
      if ([...groups.values()].some(g => g.slug === input.slug)) throw new CatalogError(409);
      const g = { id: crypto.randomUUID(), ...input, courseCount: 0 }; groups.set(g.id, g); links.set(g.id, new Set()); return g;
    },
    async updateGroup(id, patch) {
      const g = group(id);
      if ([...groups.values()].some(other => other.id !== id && other.slug === patch.slug)) throw new CatalogError(409);
      const updated = { ...g, ...patch }; groups.set(id, updated); return updated;
    },
    async listGroups(page, publicOnly, category) {
      const items = [...groups.keys()].map(group).filter(g => (!publicOnly || eligible(g)) && (!category || g.categoryId === category)).sort((a,b) => a.slug < b.slug ? -1 : 1);
      return paginate(items, page);
    },
    async groupDetail(key, page, publicOnly) {
      const id = publicOnly ? [...groups.values()].find(g => g.slug === key)?.id : key;
      if (!id) throw new CatalogError(404); const g = group(id);
      if (publicOnly && !eligible(g)) throw new CatalogError(404);
      const items = [...(links.get(id) ?? [])].sort().map(id => courses.get(id)!);
      return { ...g, courses: paginate(items, page) };
    },
    async membership(groupId, courseId, linked) {
      group(groupId); if (!courses.has(courseId)) throw new CatalogError(404);
      if (linked) links.get(groupId)!.add(courseId); else links.get(groupId)!.delete(courseId);
    },
  };
}
