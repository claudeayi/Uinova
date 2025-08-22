import 'dotenv/config'

const required = (v?: string, key?: string) => {
  if (!v) throw new Error(`Missing env var: ${key}`)
  return v
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  appUrl: process.env.APP_URL ?? 'http://localhost:4000',

  jwt: {
    secret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
  },

  db: {
    url: required(process.env.DATABASE_URL, 'DATABASE_URL'),
  },

  mailer: {
    from: process.env.MAIL_FROM ?? 'no-reply@uinova.com',
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  cloud: {
    bucket: process.env.CLOUD_BUCKET,
    region: process.env.CLOUD_REGION,
    accessKey: process.env.CLOUD_ACCESS_KEY,
    secretKey: process.env.CLOUD_SECRET_KEY,
  },

  payments: {
    stripeKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    paypalSecret: process.env.PAYPAL_SECRET,
  },

  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
  },
} as const
