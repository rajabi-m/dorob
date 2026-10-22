# Application embedding engine

Server-only, application-owned pure processing. Runtime code imports no lab code,
files or feedback. The independent lab remains unchanged. Initial compatibility
fixture is copied from the lab test dataset and fixed by its checksum.

`educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa` is the course/group
representation version: NFC, Arabic yeh/kaf folding, whitespace folding while
preserving ZWNJ and negation, a 64 KiB educational input cap, UTF-8-safe 4 KiB
chunks, normalized per-chunk vectors and byte-weighted L2-normalized pooling.
Generation clients must send at most four chunks per batch. Missing fields and
truncated fields remain explicit. Courses with only a title are excluded.
Groups use only their own definition; memberships never determine their input.
Commercial and snapshot metadata are deliberately outside educational identity.

Input hashes retain entity identity and this processing profile. Exact model
identity and immutable source/revision references must be supplied by backend
integration; this package neither stores revisions nor starts inference.
Float32 checksums serialize little-endian normalized values for pgvector storage.

Checks: `bun test packages/embedding-engine/tests`, and `bun run --cwd
packages/embedding-engine typecheck`, `lint`, `build`. Build output is disposable.

Exact algorithms default to matching >=.60, 20 per group; discovery top-12
neighbors >=.60, complete-link coherence >=.70, minimum size two; suppression
uses strictly Jaccard >.80; reconciliation retrieves at most five definitions.
Canonical IDs break ties. Existing memberships do not affect computation.
Results retain suppressed sets and direct per-member reconciliation scores.

Scope rejects more than 10,000 courses or 100 groups. Candidate caps explicitly
return `truncated`; cancellation/time caps throw unfinished computation errors
and callers must not deliver incomplete results by default. Each stage has a
120-second deadline; an orchestrator must additionally share a total algorithm
budget across stages. Inference time is separate.

Matching is O(N*G*D), discovery O(N²*D + N*k²*D), with O(N*D + N*k)
resident vector/neighborhood storage. Candidate sets have at most k+1 members.
Suppression is worst-case O(C²*k); reconciliation O(C*(G*D + 5*k*D)).
CPU work yields and checks cancellation within 4,096-pair inner blocks and 128-course
matching blocks, candidate blocks and suppression blocks. No full score matrix
or approximate index is used. Dataset/model compatibility belongs to the caller;
algorithms validate finite normalized vectors, dimensions and unique entity IDs.
