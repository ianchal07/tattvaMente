
import { embeddingEngine } from './embeddings';
import { RagStore, RagChunk } from './store';

export interface SearchResult extends RagChunk {
    score: number;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
        throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const RagRetrieval = {
    async search(
        query: string,
        documentId: string,
        topK: number = 5
    ): Promise<SearchResult[]> {
        // 1. Generate embedding for query
        const queryEmbedding = await embeddingEngine.embed(query);

        // 2. Fetch all chunks for the document
        // Optimization: In a real DB we'd use an index, but for client-side IDB with
        // < 1000 chunks, linear scan is instant (ms).
        const chunks = await RagStore.getChunksForDocument(documentId);

        if (!chunks || chunks.length === 0) {
            return [];
        }

        // 3. Score chunks
        const scoredChunks = chunks.map((chunk) => ({
            ...chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding),
        }));

        // 4. Sort and top-K
        scoredChunks.sort((a, b) => b.score - a.score);

        return scoredChunks.slice(0, topK);
    },

    async constructContext(
        query: string,
        documentId: string,
        topK: number = 5
    ): Promise<string> {
        const results = await this.search(query, documentId, topK);

        if (results.length === 0) {
            return "";
        }

        return results
            .map((chunk) => `[Chunk ${chunk.index}]\n${chunk.text}`)
            .join("\n\n---\n\n");
    }
};
