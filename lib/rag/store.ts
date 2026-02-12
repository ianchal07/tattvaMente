
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RagDocument {
    id: string;
    name: string;
    size: number;
    type: string;
    createdAt: number;
}

interface RagChunk {
    id: string;
    documentId: string;
    text: string;
    embedding: Float32Array;
    index: number;
}

interface Conversation {
    id: string;
    title: string;
    mode: 'normal' | 'rag';
    documentId?: string;
    messages: { role: string; content: string; id: string }[];
    updatedAt: number;
}

interface TattvaMenteDB extends DBSchema {
    documents: {
        key: string;
        value: RagDocument;
        indexes: { 'by-date': number };
    };
    chunks: {
        key: string;
        value: RagChunk;
        indexes: { 'by-document': string };
    };
    conversations: {
        key: string;
        value: Conversation;
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'tattvamente-rag-store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TattvaMenteDB>> | null = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<TattvaMenteDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Documents store
                if (!db.objectStoreNames.contains('documents')) {
                    const docStore = db.createObjectStore('documents', { keyPath: 'id' });
                    docStore.createIndex('by-date', 'createdAt');
                }

                // Chunks store
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
                    chunkStore.createIndex('by-document', 'documentId');
                }

                // Conversations store
                if (!db.objectStoreNames.contains('conversations')) {
                    const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                    convStore.createIndex('by-date', 'updatedAt');
                }
            },
        });
    }
    return dbPromise;
}

export const RagStore = {
    // --- Documents ---
    async saveDocument(doc: RagDocument): Promise<void> {
        const db = await getDB();
        await db.put('documents', doc);
    },

    async getDocument(id: string): Promise<RagDocument | undefined> {
        const db = await getDB();
        return db.get('documents', id);
    },

    async getAllDocuments(): Promise<RagDocument[]> {
        const db = await getDB();
        return db.getAllFromIndex('documents', 'by-date');
    },

    async deleteDocument(id: string): Promise<void> {
        const db = await getDB();
        const tx = db.transaction(['documents', 'chunks'], 'readwrite');

        // Delete document metadata
        await tx.objectStore('documents').delete(id);

        // Delete associated chunks
        const chunkStore = tx.objectStore('chunks');
        const index = chunkStore.index('by-document');
        let cursor = await index.openKeyCursor(IDBKeyRange.only(id));

        while (cursor) {
            await chunkStore.delete(cursor.primaryKey);
            cursor = await cursor.continue();
        }

        await tx.done;
    },

    // --- Chunks ---
    async saveChunks(chunks: RagChunk[]): Promise<void> {
        const db = await getDB();
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');
        for (const chunk of chunks) {
            await store.put(chunk);
        }
        await tx.done;
    },

    async getChunksForDocument(documentId: string): Promise<RagChunk[]> {
        const db = await getDB();
        return db.getAllFromIndex('chunks', 'by-document', documentId);
    },

    // --- Conversations ---
    async saveConversation(conv: Conversation): Promise<void> {
        const db = await getDB();
        await db.put('conversations', conv);
    },

    async getConversation(id: string): Promise<Conversation | undefined> {
        const db = await getDB();
        return db.get('conversations', id);
    },

    async getAllConversations(): Promise<Conversation[]> {
        const db = await getDB();
        return db.getAllFromIndex('conversations', 'by-date');
    },

    async deleteConversation(id: string): Promise<void> {
        const db = await getDB();
        await db.delete('conversations', id);
    },
};

export type { RagDocument, RagChunk, Conversation };
