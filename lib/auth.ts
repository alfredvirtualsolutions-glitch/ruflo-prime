import { betterAuth } from "better-auth"
import { Pool } from "pg"

const runtimeUrl = process.env.V0_RUNTIME_URL
const baseURL = process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : runtimeUrl)
const devOrigins = ["http://localhost:3000", runtimeUrl, "https://*.vusercontent.net", "https://*.vercel.run", "https://*.v0.build"].filter(Boolean) as string[]
const prodOrigins = [process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`, process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL,
  emailAndPassword: { enabled: true },
  trustedOrigins: process.env.NODE_ENV === "development" ? devOrigins : prodOrigins,
  ...(process.env.NODE_ENV === "development" ? { advanced: { defaultCookieAttributes: { sameSite: "none" as const, secure: true } } } : {}),
})
