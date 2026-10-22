import { PROFILE, seal, type Input, type Course, type Group } from './contracts';
// Normalization changes only the embedding copy. ZWNJ and negations are preserved.
export const normalize = (s: string) => s.normalize('NFC').replace(/\r\n?/g, '\n').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
export function utf8Prefix(s: string, limit: number) { let bytes = 0, result = ''; for (const c of s) {
    const n = Buffer.byteLength(c);
    if (bytes + n > limit)
        break;
    result += c;
    bytes += n;
} return result; }
export function buildInput(entity: 'course' | 'group', source: Course | Group): Input {
    const course = source as Course, group = source as Group;
    const fields: [
        string,
        string[]
    ][] = entity === 'course' ? [['title', [course.title]], ['description', [course.description ?? '']], ['outcomes', course.outcomes], ['prerequisites', course.prerequisites], ['audience', course.audience], ['technologies', course.technologies], ['level', [course.level ?? '']], ['syllabus', course.syllabus]] : [['title', [group.title]], ['category', [group.categoryLabel]], ['level', [group.targetLevel ?? '']], ['scope', [group.description]]];
    const missing: string[] = [], omitted: string[] = [];
    let text = '';
    for (const [name, values] of fields) {
        const normalized = values.map(normalize).filter(Boolean);
        if (!normalized.length) {
            missing.push(name);
            continue;
        }
        const field = `${name}: ${normalized.join('\n')}\n`;
        const available = 65536 - Buffer.byteLength(text), selected = utf8Prefix(field, available);
        text += selected;
        if (selected !== field)
            omitted.push(name);
    }
    const chunks: string[] = [], weights: number[] = [];
    let chunk = '', size = 0;
    for (const char of text) {
        const bytes = Buffer.byteLength(char);
        if (size + bytes > 4096) {
            chunks.push(chunk);
            weights.push(size);
            chunk = '';
            size = 0;
        }
        chunk += char;
        size += bytes;
    }
    if (chunk) {
        chunks.push(chunk);
        weights.push(size);
    }
    const substantive = entity === 'group' || [course.description ?? '', ...course.outcomes, ...course.prerequisites, ...course.audience, ...course.technologies, ...course.syllabus].some(s => normalize(s).length >= 12);
    const body = { entity, entityId: source.id, profile: PROFILE, text, chunks, weights, eligible: substantive, missing, omitted };
    const { id, ...result } = seal(body);
    return { ...result, hash: id };
}
