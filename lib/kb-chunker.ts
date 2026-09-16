import 'server-only';

export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
}

const getTokenCount = (text: string): number => Math.ceil(text.length / 4);

export function chunkText(
  text: string,
  opts?: { chunkSize?: number; chunkOverlap?: number }
): TextChunk[] {
  const normalizedText = text.trim().replace(/[ \t]+/g, ' ');
  if (!normalizedText) {
    return [];
  }

  const chunkSize = opts?.chunkSize ?? Number(process.env.KB_CHUNK_SIZE || 500);
  const chunkOverlap = opts?.chunkOverlap ?? Number(process.env.KB_CHUNK_OVERLAP || 50);

  // Helper to recursively break down text into parts that fit within chunkSize
  function breakIntoUnits(textToSplit: string, separators: RegExp[]): string[] {
    const tokenCount = getTokenCount(textToSplit);
    if (tokenCount <= chunkSize || separators.length === 0) {
      return [textToSplit];
    }

    const separator = separators[0];
    const parts = textToSplit.split(separator).filter(Boolean);
    const result: string[] = [];

    for (const part of parts) {
      if (getTokenCount(part) <= chunkSize) {
        result.push(part);
      } else {
        result.push(...breakIntoUnits(part, separators.slice(1)));
      }
    }
    return result;
  }

  // Separators: double newline (paragraphs), period + space (sentences), space (words)
  const baseUnits = breakIntoUnits(normalizedText, [/\n\s*\n/, /(?<=\.\s)/, /\s+/]);

  const chunks: TextChunk[] = [];
  let currentChunkUnits: string[] = [];
  let currentChunkTokens = 0;
  let chunkIndex = 0;

  for (let i = 0; i < baseUnits.length; i++) {
    const unit = baseUnits[i];
    const unitTokens = getTokenCount(unit);

    if (currentChunkTokens + unitTokens > chunkSize && currentChunkUnits.length > 0) {
      // Finalize current chunk
      const content = currentChunkUnits.join('');
      chunks.push({
        content: content.trim(),
        index: chunkIndex++,
        tokenCount: getTokenCount(content.trim()),
      });

      // Start new chunk with overlap
      let overlapTokens = 0;
      const overlapUnits: string[] = [];
      
      // Go backwards through current chunk units to build overlap
      for (let j = currentChunkUnits.length - 1; j >= 0; j--) {
        const uTokens = getTokenCount(currentChunkUnits[j]);
        if (overlapTokens + uTokens <= chunkOverlap) {
          overlapUnits.unshift(currentChunkUnits[j]);
          overlapTokens += uTokens;
        } else {
          // If even a single unit is bigger than overlap, try to include it if we have no overlap yet
          if (overlapUnits.length === 0) {
            overlapUnits.unshift(currentChunkUnits[j]);
            overlapTokens += uTokens;
          }
          break;
        }
      }

      currentChunkUnits = [...overlapUnits, unit];
      currentChunkTokens = overlapTokens + unitTokens;
    } else {
      currentChunkUnits.push(unit);
      currentChunkTokens += unitTokens;
    }
  }

  if (currentChunkUnits.length > 0) {
    const content = currentChunkUnits.join('');
    if (content.trim()) {
      chunks.push({
        content: content.trim(),
        index: chunkIndex++,
        tokenCount: getTokenCount(content.trim()),
      });
    }
  }

  return chunks;
}
