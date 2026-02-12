# Browser LLM - Local AI Inference Platform

A production-grade, browser-based LLM inference platform with sophisticated UI/UX, built-in debugging tools, and API exposure for third-party integrations.

## 🎯 Project Overview

Privacy-first, local AI inference running entirely in your browser using WebGPU. No servers, no API costs, complete data sovereignty.

**Target Users:** Developers, researchers, privacy-conscious power users, corporate environments

## ✨ Key Features

- **Zero Install**: Runs entirely in browser, no admin rights needed
- **Corporate-Friendly**: Works in locked-down environments
- **Privacy-First**: All processing happens locally
- **API Exposure**: RESTful API for third-party app integration
- **Debugging Tools**: Built-in performance profiler and inspector
- **Sophisticated UI**: Modern design with Ant Design 6
- **Resilient Architecture**: Multi-layer failure recovery

## 🖥️ System Requirements

### Minimum Specifications
- **RAM:** 8GB (16GB recommended)
- **GPU VRAM:** 4GB dedicated GPU
- **Storage:** 400GB SSD with 50GB+ free space
- **Browser:** Chrome/Edge 113+ with WebGPU enabled
- **Network:** Broadband (for initial model download)

### Supported Browsers
- ✅ Chrome 113+
- ✅ Edge 113+
- ⚠️ Firefox (experimental)
- ❌ Safari (limited support)

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/browser-llm.git
cd browser-llm

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000`

### First-Time Setup

1. **System Check**: Automatic hardware compatibility verification
2. **Stability Test**: 90-second GPU stability benchmark
3. **Model Download**: Select and download model (2-4GB)
4. **Ready**: Start chatting with local AI

## 📚 Documentation

- [Architecture Overview](./docs/01-ARCHITECTURE.md)
- [Technical Implementation](./docs/02-TECHNICAL-IMPLEMENTATION.md)
- [UI/UX Design System](./docs/03-UI-UX-DESIGN.md)
- [API Documentation](./docs/04-API-DOCUMENTATION.md)
- [Debugging Guide](./docs/05-DEBUGGING-GUIDE.md)
- [Storage & Caching](./docs/06-STORAGE-CACHING.md)
- [JSON System](./docs/07-JSON-SYSTEM.md)
- [Performance Monitoring](./docs/08-PERFORMANCE-MONITORING.md)
- [Error Handling](./docs/09-ERROR-HANDLING.md)
- [Testing Strategy](./docs/10-TESTING-STRATEGY.md)
- [Deployment Guide](./docs/11-DEPLOYMENT.md)
- [Contributing Guidelines](./docs/12-CONTRIBUTING.md)

## 🎨 Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** Ant Design 6
- **Styling:** Tailwind CSS + CSS Modules
- **State Management:** Zustand
- **Type Safety:** TypeScript 5+

### AI/ML
- **Inference Engine:** WebLLM
- **Runtime:** WebGPU
- **Models:** Phi-3, Mistral, Gemma (quantized)

### Storage
- **Primary:** IndexedDB
- **Cache:** Service Worker API
- **Persistence:** Storage API

### Developer Tools
- **Debugging:** Custom DevTools Panel
- **Profiling:** Performance API
- **Logging:** Structured JSON logging
- **Monitoring:** Real-time metrics dashboard

## 🏗️ Project Structure

```
browser-llm/
├── app/                          # Next.js app directory
│   ├── (routes)/                # Route groups
│   ├── api/                     # API routes for third-party access
│   └── components/              # Shared components
├── lib/                         # Core libraries
│   ├── webllm/                 # WebLLM integration
│   ├── storage/                # Storage management
│   ├── json/                   # JSON parsing system
│   ├── api/                    # API server logic
│   └── debug/                  # Debugging utilities
├── hooks/                       # React hooks
├── types/                       # TypeScript types
├── workers/                     # Web Workers
├── styles/                      # Global styles & themes
├── public/                      # Static assets
└── docs/                        # Documentation
```

## 🔧 Configuration

### Environment Variables

```env
# Development
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_MODEL_CDN=https://huggingface.co
NEXT_PUBLIC_API_ENABLED=true
NEXT_PUBLIC_DEBUG_MODE=true

# Production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

### Model Configuration

Edit `lib/webllm/model-config.ts` to configure available models:

```typescript
export const MODELS = {
  'phi-3-mini': {
    size: '2.2GB',
    vramRequired: '4GB',
    speed: 'fast',
    quality: 'good'
  }
  // ... more models
};
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📦 Building for Production

```bash
# Build static export
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel deploy
```

## 🔌 API Usage

The platform exposes a RESTful API for third-party integrations:

```javascript
// Example: Generate text
const response = await fetch('http://localhost:3000/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Hello, AI!',
    max_tokens: 100,
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.text);
```

See [API Documentation](./docs/04-API-DOCUMENTATION.md) for complete reference.

## 🐛 Debugging

Built-in debugging tools:

- **Performance Profiler**: Track inference speed, memory usage
- **Request Inspector**: View all LLM requests/responses
- **Storage Explorer**: Inspect IndexedDB contents
- **WebGPU Monitor**: Real-time GPU metrics
- **Error Tracker**: Categorized error logging

Press `Ctrl+Shift+D` to open Debug Panel.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/12-CONTRIBUTING.md).

### Development Guidelines

- Follow DRY principles
- Write comprehensive tests
- Document all public APIs
- Use TypeScript strictly
- Follow established code style

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

## 🙏 Acknowledgments

- WebLLM team for browser inference engine
- Ant Design for UI components
- Next.js team for the framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/browser-llm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/browser-llm/discussions)
- **Email**: support@your-domain.com

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Basic inference
- ✅ System compatibility
- ✅ Single model support
- 🔄 API exposure

### Phase 2
- ⏳ Multiple model support
- ⏳ Fine-tuning interface
- ⏳ Plugin system
- ⏳ Collaborative features

### Phase 3
- 📋 Model marketplace
- 📋 Cloud sync (optional)
- 📋 Mobile app
- 📋 Enterprise features

---

**Built with ❤️ for privacy-conscious developers**

## Current Implementation Status (Feb 12, 2026)

Implemented in this repository:
- Next.js + TypeScript scaffold (`app/`, `lib/`, `types/`)
- Core instrumentation utilities (`Logger`, `Debugger`, `MetricsCollector`, `BaseService`)
- Initial API routes:
  - `GET /api/v1/status`
  - `GET /api/v1/models`
  - `POST /api/v1/generate` (validated placeholder response)
- Minimal chat-shell UI in `app/components/chat-shell.tsx`

Next recommended step: wire `@mlc-ai/web-llm` into `POST /api/v1/generate` and replace placeholder output with real streaming inference.
