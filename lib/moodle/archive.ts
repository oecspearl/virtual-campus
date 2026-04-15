/**
 * Detect archive format (ZIP or TAR)
 */
export async function detectArchiveFormat(buffer: Buffer): Promise<'zip' | 'tar' | 'gzip' | 'unknown'> {
  // GZIP files start with 0x1F 0x8B
  if (buffer[0] === 0x1F && buffer[1] === 0x8B) {
    return 'gzip';
  }

  // ZIP files start with PK (0x50 0x4B)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    return 'zip';
  }

  // TAR files: check for "ustar" at byte 257 (POSIX tar)
  if (buffer.length >= 263) {
    const tarCheck = buffer.slice(257, 263);
    const ustarSignature = tarCheck.toString('ascii');
    if (ustarSignature.startsWith('ustar')) {
      return 'tar';
    }
  }

  // Alternative TAR detection: check if first 512 bytes look like TAR header
  if (buffer.length >= 512) {
    const header = buffer.slice(0, 512);
    const nullCount = header.filter(b => b === 0).length;
    // TAR headers have many null bytes
    if (nullCount > 100 && nullCount < 400) {
      return 'tar';
    }
  }

  return 'unknown';
}

/**
 * Parse a TAR archive buffer into a map of filename -> content Buffer
 */
export function parseTarArchive(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.slice(offset, offset + 512);

    // Check for end of archive (zero block)
    if (header.every(b => b === 0)) break;

    // Extract filename (bytes 0-99)
    let filename = header.slice(0, 100).toString('ascii').replace(/\0/g, '');

    // Check for ustar prefix (bytes 345-499) to extend filename
    const magic = header.slice(257, 263).toString('ascii').replace(/\0/g, '');
    if (magic.startsWith('ustar')) {
      const prefix = header.slice(345, 500).toString('ascii').replace(/\0/g, '');
      if (prefix) {
        filename = prefix + '/' + filename;
      }
    }

    // Extract file size (octal, bytes 124-135)
    const sizeStr = header.slice(124, 136).toString('ascii').replace(/\0/g, '').trim();
    const fileSize = parseInt(sizeStr, 8) || 0;

    // Type flag (byte 156): '0' or '\0' = regular file, '5' = directory
    const typeFlag = header[156];

    offset += 512; // Move past header

    // Only store regular files (type '0' = 48 or '\0' = 0)
    if ((typeFlag === 48 || typeFlag === 0) && fileSize > 0) {
      // Normalize path: strip leading ./ and /
      const normalizedPath = filename.replace(/^\.\//, '').replace(/^\//, '');
      const fileData = buffer.slice(offset, offset + fileSize);
      files.set(normalizedPath, fileData);
    }

    // Advance past file data, padded to 512-byte boundary
    offset += Math.ceil(fileSize / 512) * 512;
  }

  return files;
}
