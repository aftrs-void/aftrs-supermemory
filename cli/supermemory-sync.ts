#!/usr/bin/env node

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SupermemoryMemory {
  id: string;
  title: string;
  content: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  type: 'note' | 'link' | 'file' | 'chat';
  metadata: {
    source?: string;
    author?: string;
    description?: string;
  };
}

interface SupermemoryResponse {
  memories: SupermemoryMemory[];
  total: number;
  page: number;
  hasMore: boolean;
}

interface Config {
  apiKey: string;
  apiUrl: string;
  outputDir: string;
  includeTypes: string[];
  preserveMetadata: boolean;
  maxPages: number;
}

class SupermemorySync {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async sync(): Promise<void> {
    console.log('🚀 Starting Supermemory sync...');

    if (!this.config.apiKey) {
      throw new Error('API key is required. Set SUPERMEMORY_API_KEY environment variable or pass --api-key');
    }

    // Test connection
    await this.testConnection();

    // Create output directory
    await fs.mkdir(this.config.outputDir, { recursive: true });

    let totalImported = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= this.config.maxPages) {
      console.log(`📖 Fetching memories page ${page}...`);

      const response = await this.fetchMemories(page, 50);

      console.log(`🔄 Processing ${response.memories.length} memories...`);

      for (const memory of response.memories) {
        if (this.config.includeTypes.includes(memory.type)) {
          await this.saveMemory(memory);
          totalImported++;
          process.stdout.write(`\r✅ Imported ${totalImported} memories`);
        }
      }

      hasMore = response.hasMore;
      page++;

      // Rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Sync complete! Imported ${totalImported} memories to ${this.config.outputDir}`);
  }

  private async testConnection(): Promise<void> {
    const response = await fetch(`${this.config.apiUrl}/v1/memories?limit=1`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API connection failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Connected to Supermemory API');
  }

  private async fetchMemories(page: number = 1, limit: number = 100): Promise<SupermemoryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      types: this.config.includeTypes.join(',')
    });

    const response = await fetch(`${this.config.apiUrl}/v1/memories?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch memories: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private formatMemoryContent(memory: SupermemoryMemory): string {
    let content = '';

    // Add frontmatter if preserving metadata
    if (this.config.preserveMetadata) {
      content += '---\n';
      content += `id: ${memory.id}\n`;
      content += `type: ${memory.type}\n`;
      content += `created: ${memory.createdAt}\n`;
      content += `updated: ${memory.updatedAt}\n`;

      if (memory.url) {
        content += `url: ${memory.url}\n`;
      }

      if (memory.tags.length > 0) {
        content += `tags:\n${memory.tags.map(tag => `  - ${tag}`).join('\n')}\n`;
      }

      if (memory.metadata.source) {
        content += `source: ${memory.metadata.source}\n`;
      }

      if (memory.metadata.author) {
        content += `author: ${memory.metadata.author}\n`;
      }

      content += '---\n\n';
    }

    // Add title
    content += `# ${memory.title}\n\n`;

    // Add metadata as content if not in frontmatter
    if (!this.config.preserveMetadata && memory.url) {
      content += `**Source:** ${memory.url}\n\n`;
    }

    if (!this.config.preserveMetadata && memory.tags.length > 0) {
      content += `**Tags:** ${memory.tags.map(tag => `#${tag.replace(/\s+/g, '_')}`).join(' ')}\n\n`;
    }

    // Add main content
    content += memory.content;

    // Add creation date at bottom if not in frontmatter
    if (!this.config.preserveMetadata) {
      content += `\n\n---\n*Imported from Supermemory on ${new Date().toISOString().split('T')[0]}*\n`;
      content += `*Originally created: ${memory.createdAt}*`;
    }

    return content;
  }

  private sanitizeFilename(title: string): string {
    return title
      .replace(/[:|?<>*\\]/g, '')
      .replace(/\//g, '-')
      .substring(0, 100)
      .trim();
  }

  private async saveMemory(memory: SupermemoryMemory): Promise<void> {
    const content = this.formatMemoryContent(memory);
    const filename = this.sanitizeFilename(memory.title);

    // Create subfolder by type if preserving metadata
    let targetDir = this.config.outputDir;
    if (this.config.preserveMetadata) {
      targetDir = join(this.config.outputDir, `${memory.type}s`);
      await fs.mkdir(targetDir, { recursive: true });
    }

    const filepath = join(targetDir, `${filename}.md`);
    await fs.writeFile(filepath, content, 'utf-8');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const config: Config = {
    apiKey: process.env.SUPERMEMORY_API_KEY || '',
    apiUrl: process.env.SUPERMEMORY_API_URL || 'https://api.supermemory.ai',
    outputDir: './supermemory-export',
    includeTypes: ['note', 'link', 'file', 'chat'],
    preserveMetadata: true,
    maxPages: 100
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--api-key':
        config.apiKey = args[++i];
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--types':
        config.includeTypes = args[++i].split(',');
        break;
      case '--no-metadata':
        config.preserveMetadata = false;
        break;
      case '--max-pages':
        config.maxPages = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Supermemory Sync Tool

Usage: supermemory-sync [options]

Options:
  --api-key <key>     Supermemory API key (or set SUPERMEMORY_API_KEY env var)
  --output-dir <dir>  Output directory (default: ./supermemory-export)
  --types <types>     Comma-separated list of types to include (default: note,link,file,chat)
  --no-metadata       Don't include metadata in frontmatter
  --max-pages <n>     Maximum pages to fetch (default: 100)
  --help              Show this help message

Examples:
  supermemory-sync --api-key sm_abc123 --output-dir ./my-memories
  supermemory-sync --types note,link --no-metadata
        `);
        process.exit(0);
        break;
    }
  }

  try {
    const sync = new SupermemorySync(config);
    await sync.sync();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
