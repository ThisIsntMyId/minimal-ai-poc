import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
    apiKey: config.openaiApiKey
});

const pinecone = new Pinecone({
    apiKey: config.pineconeApiKey
});

let index = null;

// Initialize Pinecone index (singleton pattern)
async function getIndex() {
    if (!index) {
        try {
            index = pinecone.index(config.rag.indexName);
        } catch (error) {
            console.error('❌ Failed to initialize Pinecone index:', error);
            throw new Error('RAG service unavailable');
        }
    }
    return index;
}

// Generate embedding for a query
async function generateQueryEmbedding(query) {
    try {
        const response = await openai.embeddings.create({
            model: config.rag.embeddingModel,
            input: query,
        });
        
        return response.data[0].embedding;
    } catch (error) {
        console.error('❌ Failed to generate query embedding:', error);
        throw error;
    }
}

// Search for relevant chunks in Pinecone
async function searchRelevantChunks(query, maxResults = null) {
    try {
        console.log(`🔍 Searching for relevant chunks: "${query.substring(0, 100)}..."`);
        
        const queryEmbedding = await generateQueryEmbedding(query);
        const index = await getIndex();
        
        const searchResults = await index.query({
            vector: queryEmbedding,
            topK: maxResults || config.rag.maxResults,
            includeValues: false,
            includeMetadata: true
        });

        // Filter by similarity threshold
        const relevantChunks = searchResults.matches.filter(
            match => match.score >= config.rag.similarityThreshold
        );

        console.log(`📊 Found ${relevantChunks.length} relevant chunks (${searchResults.matches.length} total)`);

        // Format results
        const formattedChunks = relevantChunks.map(match => ({
            text: match.metadata.text,
            filename: match.metadata.filename,
            score: match.score,
            id: match.id
        }));

        return formattedChunks;
    } catch (error) {
        console.error('❌ Failed to search relevant chunks:', error);
        return []; // Return empty array if search fails
    }
}

// Create context from relevant chunks
function createContextFromChunks(chunks) {
    if (!chunks || chunks.length === 0) {
        return null;
    }

    // Group chunks by filename to avoid repetition
    const chunksByFile = chunks.reduce((acc, chunk) => {
        if (!acc[chunk.filename]) {
            acc[chunk.filename] = [];
        }
        acc[chunk.filename].push(chunk);
        return acc;
    }, {});

    // Create context string
    let context = "Based on the fitness documents, here's relevant information:\n\n";
    
    Object.entries(chunksByFile).forEach(([filename, fileChunks]) => {
        context += `From ${filename}:\n`;
        fileChunks.forEach((chunk, index) => {
            context += `${index + 1}. ${chunk.text.trim()}\n\n`;
        });
        context += "---\n\n";
    });

    return context;
}

// Create citations from chunks
function createCitations(chunks) {
    if (!chunks || chunks.length === 0) {
        return [];
    }

    // Get unique sources
    const sources = [...new Set(chunks.map(chunk => chunk.filename))];
    
    return sources.map(filename => ({
        filename,
        chunks: chunks.filter(chunk => chunk.filename === filename).length
    }));
}

// Main RAG function - retrieve and augment
export async function retrieveAndAugment(query, maxResults = null) {
    try {
        // Check if RAG is available
        if (!config.pineconeApiKey) {
            console.log('⚠️  Pinecone API key not configured, skipping RAG');
            return {
                context: null,
                citations: [],
                chunks: []
            };
        }

        // Search for relevant chunks
        const relevantChunks = await searchRelevantChunks(query, maxResults);
        
        if (relevantChunks.length === 0) {
            console.log('ℹ️  No relevant chunks found for query');
            return {
                context: null,
                citations: [],
                chunks: []
            };
        }

        // Create context and citations
        const context = createContextFromChunks(relevantChunks);
        const citations = createCitations(relevantChunks);

        console.log(`✅ RAG augmentation complete: ${relevantChunks.length} chunks, ${citations.length} sources`);

        return {
            context,
            citations,
            chunks: relevantChunks
        };

    } catch (error) {
        console.error('❌ RAG retrieval failed:', error);
        return {
            context: null,
            citations: [],
            chunks: [],
            error: error.message
        };
    }
}

// Check if query is fitness-related (simple keyword matching)
export function isFitnessRelated(query) {
    const fitnessKeywords = [
        'exercise', 'workout', 'fitness', 'training', 'muscle', 'cardio',
        'strength', 'nutrition', 'diet', 'meal', 'calories', 'protein',
        'weight', 'fat', 'gym', 'running', 'swimming', 'yoga', 'pilates',
        'supplements', 'recovery', 'rest', 'sleep', 'health', 'wellness'
    ];

    const queryLower = query.toLowerCase();
    return fitnessKeywords.some(keyword => queryLower.includes(keyword));
}

// Get RAG service status
export async function getRAGStatus() {
    try {
        if (!config.pineconeApiKey) {
            return { status: 'disabled', reason: 'No Pinecone API key configured' };
        }

        const index = await getIndex();
        const stats = await index.describeIndexStats();
        
        return {
            status: 'active',
            indexName: config.rag.indexName,
            vectorCount: stats.totalVectorCount || 0,
            indexFullness: stats.indexFullness || 0
        };
    } catch (error) {
        return { 
            status: 'error', 
            reason: error.message 
        };
    }
}