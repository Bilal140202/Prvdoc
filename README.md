# PrivacyThink

**Privacy-first document analysis with client-side AI**

🔒 **Your documents never leave your device. Ever.**

PrivacyThink is a web-based document analysis tool that brings the privacy guarantees of air-gapped systems to any modern browser. All processing happens locally using WebAssembly and client-side AI models.

## 🚀 Features

### 📄 Document Processing
- **PDF Support**: Text extraction + OCR for scanned documents
- **DOCX Files**: Microsoft Word document parsing
- **Plain Text**: TXT file support
- **Audio Files**: Speech-to-text transcription (MP3, WAV, M4A)
- **Batch Upload**: Process multiple documents simultaneously

### 🤖 Privacy-First AI
- **Client-Side Models**: All AI runs in your browser via WebAssembly
- **Zero Server Calls**: No documents or queries sent to external servers
- **Offline Capable**: Works completely offline after initial model download
- **Multiple Model Options**: Choose from fast, balanced, or accurate models

### 💬 Intelligent Chat
- **Document Q&A**: Ask questions about your uploaded documents
- **Source Citations**: Every answer includes page references and quotes
- **Context Aware**: Maintains conversation history and context
- **RAG Architecture**: Retrieval-Augmented Generation for accurate responses

### 🛡️ Privacy Guarantees
- **Local Storage**: All data stays in your browser's IndexedDB
- **No Analytics**: Zero tracking or data collection
- **Encrypted Storage**: Optional client-side encryption
- **Full Control**: Delete documents and chat history anytime

## 🔧 Technical Implementation

### Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **AI Engine**: Transformers.js (Hugging Face)
- **Document Processing**: pdf.js, Tesseract.js, mammoth
- **Storage**: IndexedDB for local data persistence
- **PWA**: Offline support with service workers

### Supported Models
- **TinyLlama 1.1B** (Recommended): ~1.1GB, fast performance, 3GB RAM
- **Phi-3.5 Mini**: ~2.4GB, balanced performance, 6GB RAM
- **Custom Models**: Support for any Transformers.js compatible model

### System Requirements
- **Browser**: Chrome 110+, Firefox 120+, Safari 17+
- **RAM**: 8GB minimum (12GB recommended for large documents)
- **Storage**: 6GB free space for models and documents
- **Internet**: Required only for initial model download

## 🏗️ Development

### Setup
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

### Environment
- Node.js 18+
- Modern browser with WebAssembly support
- HTTPS required for some features

## 📋 Usage

1. **First Launch**: Download and initialize AI model (one-time setup)
2. **Upload Documents**: Drag & drop or select files to analyze
3. **Wait for Processing**: Documents are chunked and indexed locally
4. **Start Chatting**: Ask questions about your documents
5. **View Sources**: Click citations to see exact document references

## 🔐 Privacy Policy

PrivacyThink is designed with privacy-first principles:

- **No Data Collection**: We don't collect, store, or transmit any personal data
- **Local Processing**: All operations happen in your browser
- **No Servers**: Your documents and conversations never touch our servers
- **Open Source**: Full transparency in our privacy implementations
- **User Control**: You own and control all your data

## 🚀 Deployment

### Static Hosting
PrivacyThink can be deployed to any static hosting service:
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages
- AWS S3 + CloudFront

### Self-Hosting
1. Build the application: `npm run build`
2. Serve the `dist` folder with any HTTP server
3. Ensure HTTPS for full functionality

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and ensure all changes maintain our privacy-first principles.

### Key Principles for Contributors
- No external API calls during document processing
- All data must stay local to the user's browser
- Maintain offline functionality
- Preserve user privacy and control

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Limitations

- Large documents (>100MB) may impact performance
- Mobile browsers have limited support due to memory constraints
- Initial model download required (1-3GB depending on model choice)
- Some advanced AI features require desktop browsers

## 🔗 Links

- **Live Demo**: [PrivacyThink Demo](https://privacythink.com)
- **Documentation**: [Full Documentation](https://docs.privacythink.com)
- **Support**: [GitHub Issues](https://github.com/yourusername/privacythink/issues)

---

**Built with privacy in mind. Your data stays yours.**