
import { pipeline, env } from '@xenova/transformers';

// Skip local checks for now since we are running in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class EmbeddingEngine {
    private static instance: EmbeddingEngine;
    private extractor: any = null;
    private modelName = 'Xenova/all-MiniLM-L6-v2';

    private constructor() { }

    public static getInstance(): EmbeddingEngine {
        if (!EmbeddingEngine.instance) {
            EmbeddingEngine.instance = new EmbeddingEngine();
        }
        return EmbeddingEngine.instance;
    }

    public async init(progressCallback?: (data: any) => void) {
        if (this.extractor) return;

        this.extractor = await pipeline('feature-extraction', this.modelName, {
            quantized: true,
            progress_callback: progressCallback,
        });
    }

    public async embed(text: string): Promise<Float32Array> {
        if (!this.extractor) {
            await this.init();
        }

        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return output.data as Float32Array;
    }
}

export const embeddingEngine = EmbeddingEngine.getInstance();
