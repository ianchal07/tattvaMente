
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set the worker source properly
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ChunkOptions {
    maxTokens: number;
    overlapTokens: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
    maxTokens: 600,
    overlapTokens: 80,
};

export async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText;
}

export function normalizeText(raw: string): string {
    return raw
        .replace(/\r\n/g, "\n")
        .replace(/\n{2,}/g, "\n\n")        // collapse excessive newlines
        .replace(/[ \t]+/g, " ")           // collapse whitespace
        .replace(/-\n/g, "")               // fix broken hyphenated words
        .trim();
}

export function splitIntoSentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+|\S+$/g) || [];
}

export function chunkText(
    text: string,
    options: ChunkOptions = DEFAULT_OPTIONS
): string[] {
    const sentences = splitIntoSentences(text);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;

    // Approximate token count (4 chars ~= 1 token)
    const estimateTokens = (t: string) => Math.ceil(t.length / 4);

    for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (currentTokenCount + sentenceTokens > options.maxTokens) {
            // Chunk is full, push it
            const chunkText = currentChunk.join(" ").trim();
            chunks.push(chunkText);

            // Create overlap for next chunk
            // We look back by overlapTokens * 4 chars approx
            const overlapChars = options.overlapTokens * 4;
            const currentText = chunkText;

            // Take the last N characters (naive overlap)
            // A better way for sentence-based: keep last K sentences
            // But strictly following prompt: "overlapText = chunkText.slice(...)"
            const overlapText = currentText.slice(-overlapChars);

            // Reset current chunk with overlap
            currentChunk = [overlapText];
            currentTokenCount = estimateTokens(overlapText);
        }

        currentChunk.push(sentence);
        currentTokenCount += sentenceTokens;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(" ").trim());
    }

    return chunks;
}
