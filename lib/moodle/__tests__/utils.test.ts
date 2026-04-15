import { describe, it, expect } from 'vitest'
import { decodeHtmlEntities, getTextContent } from '../utils'

describe('decodeHtmlEntities', () => {
  it('decodes common HTML entities', () => {
    expect(decodeHtmlEntities('&lt;p&gt;Hello&lt;/p&gt;')).toBe('<p>Hello</p>')
    expect(decodeHtmlEntities('&amp;')).toBe('&')
    expect(decodeHtmlEntities('&quot;quoted&quot;')).toBe('"quoted"')
    expect(decodeHtmlEntities('&#39;apostrophe&#39;')).toBe("'apostrophe'")
    expect(decodeHtmlEntities('non&nbsp;breaking')).toBe('non breaking')
  })

  it('handles multiple entities in one string', () => {
    expect(decodeHtmlEntities('&lt;a href=&quot;url&quot;&gt;link&lt;/a&gt;'))
      .toBe('<a href="url">link</a>')
  })

  it('returns empty string for falsy input', () => {
    expect(decodeHtmlEntities('')).toBe('')
    expect(decodeHtmlEntities(null as any)).toBe('')
    expect(decodeHtmlEntities(undefined as any)).toBe('')
  })

  it('passes through strings without entities unchanged', () => {
    expect(decodeHtmlEntities('plain text')).toBe('plain text')
  })
})

describe('getTextContent', () => {
  it('extracts simple string value', () => {
    expect(getTextContent({ title: 'Hello' }, 'title')).toBe('Hello')
  })

  it('extracts from nested path', () => {
    expect(getTextContent({ info: { name: 'Course' } }, 'info.name')).toBe('Course')
  })

  it('extracts from XML2JS array format', () => {
    expect(getTextContent({ title: ['Hello'] }, 'title')).toBe('Hello')
  })

  it('extracts from XML2JS text content format', () => {
    expect(getTextContent({ title: [{ _: 'Hello' }] }, 'title')).toBe('Hello')
  })

  it('falls back to "n" when "name" not found', () => {
    expect(getTextContent({ n: 'Shortname' }, 'name')).toBe('Shortname')
  })

  it('falls back to "_" property for text content', () => {
    expect(getTextContent({ _: 'text content' }, 'missing')).toBe('text content')
  })

  it('returns empty string for null/undefined data', () => {
    expect(getTextContent(null, 'anything')).toBe('')
    expect(getTextContent(undefined, 'anything')).toBe('')
  })

  it('returns empty string for missing paths', () => {
    expect(getTextContent({ a: 1 }, 'b')).toBe('')
    expect(getTextContent({ a: { b: 1 } }, 'a.c')).toBe('')
  })

  it('handles deeply nested XML2JS arrays', () => {
    const data = [{ info: [{ name: ['Course Title'] }] }]
    expect(getTextContent(data, 'info.name')).toBe('Course Title')
  })
})
