import { assert } from './contracts';
/** Stop reading as soon as a peer exceeds the bound, including chunked responses. */
export async function boundedJSON(response: Response, limit: number) { assert(Number(response.headers.get('content-length') ?? 0) <= limit, 'Response too large'); const reader = response.body?.getReader(); assert(reader, 'Missing response body'); let bytes = 0; const chunks: Uint8Array[] = []; try {
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        bytes += value.length;
        if (bytes > limit) {
            await reader.cancel();
            throw Error('Response too large');
        }
        chunks.push(value);
    }
}
finally {
    reader.releaseLock();
} const all = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
} return JSON.parse(new TextDecoder().decode(all)); }
