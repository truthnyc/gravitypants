import { describe, expect, it } from 'vitest'
import { brandApplicationInput } from '../../src/lib/directory/applications.functions'

const valid = { name: 'Jane Smith', email: 'jane@example.com', brand: 'North Star', website: 'https://example.com', category: 'Crafts & Hobbies', description: 'Independent yarn and craft supplies made with care.', moods: ['cozy'], message: '', company: '', logo: { base64: 'aGVsbG8=', type: 'image/png' } }

describe('Aimanté brand applications', () => {
  it('accepts a full profile with one to three moods', () => expect(brandApplicationInput.parse(valid).moods).toEqual(['cozy']))
  it('rejects an application without a mood', () => expect(brandApplicationInput.safeParse({ ...valid, moods: [] }).success).toBe(false))
  it('rejects more than three moods', () => expect(brandApplicationInput.safeParse({ ...valid, moods: ['cozy', 'warm', 'calm', 'bright'] }).success).toBe(false))
  it('rejects oversized encoded logos', () => expect(brandApplicationInput.safeParse({ ...valid, logo: { base64: 'a'.repeat(3_000_001), type: 'image/png' } }).success).toBe(false))
})