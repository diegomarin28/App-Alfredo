// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

// web-push 4 es ESM y solo tiene exports con nombre (no hay default).
const sendNotification = vi.fn(async () => ({}))
vi.mock('web-push', () => ({ sendNotification }))

const { WebPushSender } = await import('@/avisos/push')

describe('WebPushSender', () => {
  it('manda con sendNotification de web-push, con las claves VAPID', async () => {
    const s = new WebPushSender('pub', 'priv', 'mailto:x@y.z')
    await s.enviar({ endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' }, { titulo: 'T', cuerpo: 'C' } as never)
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } },
      JSON.stringify({ titulo: 'T', cuerpo: 'C' }),
      expect.objectContaining({ vapidDetails: { subject: 'mailto:x@y.z', publicKey: 'pub', privateKey: 'priv' } }),
    )
  })
})
