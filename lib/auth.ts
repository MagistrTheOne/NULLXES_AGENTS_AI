import { betterAuth } from "better-auth"
import { Pool } from "pg"

/**
 * Better Auth + Neon Postgres
 * Docs: https://better-auth.com/docs/installation
 * Neon: https://neon.com/docs/guides/nextjs
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // https://better-auth.com/docs/authentication/github
  // https://better-auth.com/docs/authentication/google
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
})
