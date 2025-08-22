import request from 'supertest'
import { describe, it, expect } from 'vitest'
import createApp from '../src/app' // adapte si nécessaire

describe('Health', () => {
  it('GET /health -> 200', async () => {
    const app = await createApp()
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
  })
})
