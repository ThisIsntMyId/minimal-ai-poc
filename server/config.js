import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server configuration
    port: process.env.PORT || 3000,
    
    // API Keys
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    
    // RAG Configuration
    rag: {
        documentsPath: process.env.RAG_DOCUMENTS_PATH || './AI Fitness',
        indexName: process.env.RAG_INDEX_NAME || 'fitness-docs',
        chunkSize: parseInt(process.env.RAG_CHUNK_SIZE) || 1000,
        chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP) || 200,
        embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
        maxResults: parseInt(process.env.RAG_MAX_RESULTS) || 3,
        similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.5
    }
};