import { describe, it, expect } from 'vitest'
import { detectArchiveFormat, parseTarArchive } from '../archive'

describe('detectArchiveFormat', () => {
  it('detects ZIP format (PK magic bytes)', async () => {
    const buf = Buffer.alloc(512)
    buf[0] = 0x50 // P
    buf[1] = 0x4B // K
    expect(await detectArchiveFormat(buf)).toBe('zip')
  })

  it('detects GZIP format (1F 8B magic bytes)', async () => {
    const buf = Buffer.alloc(512)
    buf[0] = 0x1F
    buf[1] = 0x8B
    expect(await detectArchiveFormat(buf)).toBe('gzip')
  })

  it('detects TAR format (ustar at byte 257)', async () => {
    const buf = Buffer.alloc(512)
    buf.write('ustar', 257, 'ascii')
    expect(await detectArchiveFormat(buf)).toBe('tar')
  })

  it('returns unknown for unrecognized format', async () => {
    const buf = Buffer.from('this is just plain text and not an archive at all, really')
    expect(await detectArchiveFormat(buf)).toBe('unknown')
  })

  it('returns unknown for empty buffer', async () => {
    const buf = Buffer.alloc(0)
    expect(await detectArchiveFormat(buf)).toBe('unknown')
  })
})

describe('parseTarArchive', () => {
  function createTarEntry(filename: string, content: string): Buffer {
    const header = Buffer.alloc(512)
    // Filename (bytes 0-99)
    header.write(filename, 0, 'ascii')
    // File size in octal (bytes 124-135)
    const size = Buffer.byteLength(content)
    header.write(size.toString(8).padStart(11, '0'), 124, 'ascii')
    // Type flag: '0' = regular file (byte 156)
    header[156] = 48 // ASCII '0'
    // ustar magic (bytes 257-262)
    header.write('ustar', 257, 'ascii')

    // Pad content to 512-byte boundary
    const contentBuf = Buffer.from(content)
    const paddedSize = Math.ceil(size / 512) * 512
    const dataBuf = Buffer.alloc(paddedSize)
    contentBuf.copy(dataBuf)

    return Buffer.concat([header, dataBuf])
  }

  it('parses a single-file TAR archive', () => {
    const entry = createTarEntry('hello.txt', 'Hello World')
    const endBlock = Buffer.alloc(1024) // two zero blocks = end of archive
    const tar = Buffer.concat([entry, endBlock])

    const files = parseTarArchive(tar)
    expect(files.size).toBe(1)
    expect(files.get('hello.txt')?.toString()).toBe('Hello World')
  })

  it('parses multiple files', () => {
    const entry1 = createTarEntry('a.txt', 'File A')
    const entry2 = createTarEntry('b.txt', 'File B content')
    const endBlock = Buffer.alloc(1024)
    const tar = Buffer.concat([entry1, entry2, endBlock])

    const files = parseTarArchive(tar)
    expect(files.size).toBe(2)
    expect(files.get('a.txt')?.toString()).toBe('File A')
    expect(files.get('b.txt')?.toString()).toBe('File B content')
  })

  it('strips leading ./ from filenames', () => {
    const entry = createTarEntry('./path/file.xml', '<xml/>')
    const endBlock = Buffer.alloc(1024)
    const tar = Buffer.concat([entry, endBlock])

    const files = parseTarArchive(tar)
    expect(files.has('path/file.xml')).toBe(true)
  })

  it('returns empty map for empty archive', () => {
    const endBlock = Buffer.alloc(1024)
    const files = parseTarArchive(endBlock)
    expect(files.size).toBe(0)
  })
})
