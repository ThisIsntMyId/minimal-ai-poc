import { Pinecone } from '@pinecone-database/pinecone';
import mammoth from 'mammoth';
import { readdir, readFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { config } from '../config.js';
console.log("🚀 ~ config:", config)

const openai = new OpenAI({
    apiKey: config.openaiApiKey
});

const pinecone = new Pinecone({
    apiKey: config.pineconeApiKey
});

// Initialize Pinecone index
async function initializePinecone() {
    console.log('🚀 Initializing Pinecone...');
    
    try {
        // List existing indexes
        const indexes = await pinecone.listIndexes();
        const existingIndex = indexes.indexes?.find(idx => idx.name === config.rag.indexName);
        
        if (existingIndex) {
            console.log(`📂 Found existing index: ${config.rag.indexName}`);
        } else {
            console.log(`📂 Creating new index: ${config.rag.indexName}`);
            await pinecone.createIndex({
                name: config.rag.indexName,
                dimension: 1536, // OpenAI text-embedding-3-small dimension
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            
            // Wait for index to be ready
            console.log('⏳ Waiting for index to be ready...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        const index = pinecone.index(config.rag.indexName);
        console.log('✅ Pinecone initialized successfully');
        return index;
        
    } catch (error) {
        console.error('❌ Failed to initialize Pinecone:', error);
        throw error;
    }
}

// Find all .docx files
async function findDocuments() {
    console.log(`📁 Scanning for documents in: ${config.rag.documentsPath}`);
    
    const files = await readdir(config.rag.documentsPath, { 
        recursive: true,
        withFileTypes: true 
    });
    
    const docxFiles = files
        .filter(file => file.isFile() && extname(file.name).toLowerCase() === '.docx')
        .map(file => join(config.rag.documentsPath, file.name));

    console.log(`📋 Found ${docxFiles.length} .docx files`);
    docxFiles.forEach(file => console.log(`  • ${basename(file)}`));
    
    return docxFiles;
}

// Extract text from a single .docx file
async function extractTextFromDocx(filePath) {
    console.log(`📖 Extracting text from: ${basename(filePath)}`);
    
    const buffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    if (result.messages.length > 0) {
        console.log(`⚠️  Warnings for ${basename(filePath)}:`, result.messages);
    }

    return {
        text: result.value,
        filename: basename(filePath),
        path: filePath
    };
}

// Split text into chunks
function chunkText(text, filename) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
        const sentenceLength = sentence.trim().length;
        
        // If adding this sentence would exceed chunk size
        if (currentLength + sentenceLength > config.rag.chunkSize && currentChunk.length > 0) {
            chunks.push({
                text: currentChunk.trim(),
                filename: filename,
                chunk_id: randomUUID(),
                length: currentLength
            });

            // Start new chunk with overlap
            const words = currentChunk.split(' ');
            const overlapWords = words.slice(-Math.floor(config.rag.chunkOverlap / 5));
            currentChunk = overlapWords.join(' ') + ' ' + sentence.trim();
            currentLength = currentChunk.length;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
            currentLength = currentChunk.length;
        }
    }

    // Add the last chunk
    if (currentChunk.trim().length > 0) {
        chunks.push({
            text: currentChunk.trim(),
            filename: filename,
            chunk_id: randomUUID(),
            length: currentLength
        });
    }

    return chunks;
}

// Generate embeddings for chunks
async function generateEmbeddings(chunks) {
    console.log(`🔮 Generating embeddings for ${chunks.length} chunks...`);
    
    const batchSize = 100;
    const embeddings = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`  Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

        const response = await openai.embeddings.create({
            model: config.rag.embeddingModel,
            input: batch.map(chunk => chunk.text),
        });

        embeddings.push(...response.data.map(item => item.embedding));

        // Small delay for rate limits
        if (i + batchSize < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`✅ Generated ${embeddings.length} embeddings`);
    return embeddings;
}

// Store chunks and embeddings in Pinecone
async function storeInPinecone(chunks, embeddings, index) {
    console.log('💾 Storing chunks in Pinecone...');

    // Prepare vectors for upsert
    const vectors = chunks.map((chunk, i) => ({
        id: chunk.chunk_id,
        values: embeddings[i],
        metadata: {
            text: chunk.text,
            filename: chunk.filename,
            length: chunk.length,
            created_at: new Date().toISOString()
        }
    }));

    // Upsert in batches (Pinecone has limits)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        console.log(`  Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)}`);
        
        await index.upsert(batch);
        
        // Small delay between batches
        if (i + batchSize < vectors.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`✅ Stored ${chunks.length} chunks in Pinecone`);
}

// Check if document already exists in Pinecone
async function checkExistingDocument(filename, index) {
    try {
        const queryResponse = await index.query({
            vector: new Array(1536).fill(0), // Dummy vector
            filter: { filename: { $eq: filename } },
            topK: 1,
            includeMetadata: true
        });
        
        return queryResponse.matches && queryResponse.matches.length > 0;
    } catch (error) {
        console.log(`⚠️  Could not check existing document: ${error.message}`);
        return false;
    }
}

// Process a single document
async function processDocument(filePath, index) {
    try {
        const doc = await extractTextFromDocx(filePath);
        
        if (!doc.text || doc.text.trim().length < 100) {
            console.log(`⚠️  Skipping ${doc.filename} - insufficient text content`);
            return false;
        }

        // Check if document already processed
        const exists = await checkExistingDocument(doc.filename, index);
        if (exists) {
            console.log(`⚠️  Document ${doc.filename} already exists in Pinecone`);
            console.log(`   Use --clear to reset the index`);
            return 'skipped';
        }

        console.log(`📝 Processing ${doc.filename} (${doc.text.length} characters)`);

        const chunks = chunkText(doc.text, doc.filename);
        console.log(`📋 Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            console.log(`⚠️  No chunks created for ${doc.filename}`);
            return false;
        }

        const embeddings = await generateEmbeddings(chunks);
        await storeInPinecone(chunks, embeddings, index);

        console.log(`✅ Successfully processed ${doc.filename}\n`);
        return true;

    } catch (error) {
        console.error(`❌ Error processing ${basename(filePath)}:`, error);
        return false;
    }
}

// Clear Pinecone index
async function clearIndex() {
    try {
        console.log('🗑️  Clearing Pinecone index...');
        
        const index = pinecone.index(config.rag.indexName);
        
        // Delete all vectors (this might take some time)
        await index.deleteAll();
        
        console.log('✅ Index cleared successfully');
        console.log('⏳ Wait a few moments before adding new data');
        
    } catch (error) {
        console.error('❌ Error clearing index:', error);
    }
}

// Get index stats
async function getIndexStats() {
    try {
        const index = pinecone.index(config.rag.indexName);
        const stats = await index.describeIndexStats();
        return stats;
    } catch (error) {
        console.log('⚠️  Could not get index stats:', error.message);
        return null;
    }
}

// Show help information
function showHelp() {
    console.log(`
🤖 RAG Setup Script for AI Fitness Documents (Pinecone)

Usage:
  node scripts/setup-rag.js          # Process documents and create embeddings
  node scripts/setup-rag.js --clear  # Clear existing index
  node scripts/setup-rag.js --stats  # Show index statistics
  node scripts/setup-rag.js --help   # Show this help

Configuration:
  Documents path: ${config.rag.documentsPath}
  Pinecone index: ${config.rag.indexName}
  Chunk size: ${config.rag.chunkSize} characters
  Embedding model: ${config.rag.embeddingModel}

Features:
  - Cloud-based vector storage with Pinecone
  - Automatic duplicate detection
  - Scalable and fast similarity search
  - Works on all platforms

Requirements:
  - OpenAI API key in .env file (OPENAI_API_KEY)
  - Pinecone API key in .env file (PINECONE_API_KEY)
  - .docx files in the documents folder

Setup:
  1. Create a Pinecone account at https://pinecone.io
  2. Get your API key from the Pinecone console
  3. Add PINECONE_API_KEY to your .env file
    `);
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    // Handle CLI arguments
    if (args.includes('--help')) {
        showHelp();
        return;
    }

    if (args.includes('--clear')) {
        await clearIndex();
        return;
    }

    if (args.includes('--stats')) {
        console.log('📊 Getting index statistics...');
        const stats = await getIndexStats();
        if (stats) {
            console.log('📈 Index Stats:', JSON.stringify(stats, null, 2));
        }
        return;
    }

    // Main processing
    console.log('🤖 Starting RAG Setup for AI Fitness Documents (Pinecone)\n');

    try {
        // Check API keys
        if (!config.openaiApiKey) {
            console.error('❌ OpenAI API key not found. Please set OPENAI_API_KEY in .env file');
            return;
        }

        if (!config.pineconeApiKey) {
            console.error('❌ Pinecone API key not found. Please set PINECONE_API_KEY in .env file');
            return;
        }

        // Initialize Pinecone
        const index = await initializePinecone();

        // Find all documents
        const documents = await findDocuments();
        
        if (documents.length === 0) {
            console.log('❌ No .docx files found in the documents folder');
            return;
        }

        // Process each document
        console.log(`\n🔄 Processing ${documents.length} documents...\n`);
        
        let processedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const docPath of documents) {
            const result = await processDocument(docPath, index);
            if (result === true) {
                processedCount++;
            } else if (result === 'skipped') {
                skippedCount++;
            } else {
                errorCount++;
            }
        }

        // Get final stats
        const stats = await getIndexStats();
        
        // Summary
        console.log('📊 Processing Summary:');
        console.log(`✅ Successfully processed: ${processedCount} documents`);
        console.log(`⏭️  Skipped (already exists): ${skippedCount} documents`);
        console.log(`❌ Errors: ${errorCount} documents`);
        
        if (stats) {
            console.log(`📚 Total vectors in index: ${stats.totalVectorCount || 0}`);
            console.log(`💾 Index size: ${stats.indexFullness || 0}%`);
        }
        
        if (processedCount > 0) {
            console.log('\n🎉 RAG setup completed successfully!');
            console.log('🚀 You can now use the chat API with RAG functionality');
            console.log(`🔗 Pinecone index: ${config.rag.indexName}`);
        }

    } catch (error) {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

main().catch(console.error);