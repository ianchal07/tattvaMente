# TattvaMente

> **First-Principles Intelligence in Your Browser**

**TattvaMente** (from *Tattva* "fundamental principle" + *Mente* "mind") is a deterministic, schema-aware, resilience-first intelligence engine running entirely in your browser using WebGPU.

It is designed for structured reasoning, privacy, and architectural seriousness, operating without server-side dependencies.

## Key Features

-   **Client-Side Execution**: Runs fully local using WebLLM and WebGPU.
-   **Structure-First**: Built for reliable, schema-driven outputs.
-   **Privacy-Centric**: No data leaves your machine.
-   **Engineering-Driven**: Observable, measurable, and resilient.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open Browser**:
    Navigate to `http://localhost:3000`.

## Architecture

TattvaMente leverages:
-   **Next.js App Router** for the application framework.
-   **WebLLM** for hardware-accelerated inference.
-   **Ant Design** for a precise, technical UI.
-   **Local Storage & Cache API** for model persistence.

## System Requirements

-   A browser with **WebGPU support** (Chrome 113+, Edge 113+).
-   GPU with sufficient VRAM (4GB+ recommended for 7B models).

## License

MIT
