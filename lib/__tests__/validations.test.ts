import { describe, it, expect } from 'vitest'
import { courseUpdateSchema, userUpdateSchema, lessonUpdateSchema, validateBody } from '../validations'

describe('courseUpdateSchema', () => {
  it('accepts a valid partial course update', () => {
    const result = courseUpdateSchema.safeParse({ title: 'Intro to Math', published: true })
    expect(result.success).toBe(true)
  })

  it('accepts an empty object (all fields optional)', () => {
    const result = courseUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects title that is empty string', () => {
    const result = courseUpdateSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid difficulty value', () => {
    const result = courseUpdateSchema.safeParse({ difficulty: 'expert' })
    expect(result.success).toBe(false)
  })

  it('accepts valid difficulty values', () => {
    for (const d of ['beginner', 'intermediate', 'advanced']) {
      const result = courseUpdateSchema.safeParse({ difficulty: d })
      expect(result.success).toBe(true)
    }
  })

  it('accepts valid course_format values', () => {
    for (const f of ['lessons', 'topics', 'weekly', 'grid', 'player']) {
      const result = courseUpdateSchema.safeParse({ course_format: f })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid thumbnail URL', () => {
    const result = courseUpdateSchema.safeParse({ thumbnail: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('accepts null thumbnail', () => {
    const result = courseUpdateSchema.safeParse({ thumbnail: null })
    expect(result.success).toBe(true)
  })
})

describe('userUpdateSchema', () => {
  const validUser = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'student' as const,
  }

  it('accepts a valid user', () => {
    const result = userUpdateSchema.safeParse(validUser)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = userUpdateSchema.safeParse({ name: 'Jane' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = userUpdateSchema.safeParse({ ...validUser, email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = userUpdateSchema.safeParse({ ...validUser, role: 'superuser' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    const roles = ['super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent']
    for (const role of roles) {
      const result = userUpdateSchema.safeParse({ ...validUser, role })
      expect(result.success).toBe(true)
    }
  })

  it('accepts optional password with min length', () => {
    const result = userUpdateSchema.safeParse({ ...validUser, password: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects password that is too short', () => {
    const result = userUpdateSchema.safeParse({ ...validUser, password: '123' })
    expect(result.success).toBe(false)
  })
})

describe('lessonUpdateSchema', () => {
  it('accepts a valid partial lesson update', () => {
    const result = lessonUpdateSchema.safeParse({ title: 'Lesson 1', order: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts an empty object', () => {
    const result = lessonUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects negative order', () => {
    const result = lessonUpdateSchema.safeParse({ order: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid video_url', () => {
    const result = lessonUpdateSchema.safeParse({ video_url: 'not-url' })
    expect(result.success).toBe(false)
  })

  it('accepts null video_url', () => {
    const result = lessonUpdateSchema.safeParse({ video_url: null })
    expect(result.success).toBe(true)
  })

  it('accepts valid section_id UUID', () => {
    const result = lessonUpdateSchema.safeParse({ section_id: '550e8400-e29b-41d4-a716-446655440000' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid section_id', () => {
    const result = lessonUpdateSchema.safeParse({ section_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('validateBody', () => {
  it('returns success with parsed data for valid input', () => {
    const result = validateBody(courseUpdateSchema, { title: 'Test', published: true })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ title: 'Test', published: true })
  })

  it('returns failure with response for invalid input', () => {
    const result = validateBody(courseUpdateSchema, { difficulty: 'impossible' })
    expect(result.success).toBe(false)
    expect(result.response).toBeDefined()
    expect(result.response!.status).toBe(400)
  })
})
