"use server"

import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { alerts, agents, reports, tasks } from "@/lib/db/schema"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function getCommandCenterData() {
  const userId = await getUserId()
  const [taskRows, agentRows, reportRows, alertRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.updatedAt)),
    db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.createdAt)),
    db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt)),
    db.select().from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.resolved, false))).orderBy(desc(alerts.createdAt)),
  ])
  return { tasks: taskRows, agents: agentRows, reports: reportRows, alerts: alertRows }
}

export async function createTask(input: { title: string; description?: string; priority?: string }) {
  const userId = await getUserId()
  const title = input.title.trim()
  if (!title || title.length > 240) throw new Error("Task title is required")
  await db.insert(tasks).values({ id: crypto.randomUUID(), userId, title, description: input.description?.trim().slice(0, 2000), priority: input.priority ?? "normal", createdAt: new Date(), updatedAt: new Date() })
  revalidatePath("/")
}

export async function updateTaskStatus(id: string, status: string) {
  const userId = await getUserId()
  const allowed = ["queued", "working", "review", "blocked", "complete"]
  if (!allowed.includes(status)) throw new Error("Invalid task status")
  await db.update(tasks).set({ status, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  revalidatePath("/")
}

export async function resolveAlert(id: string) {
  const userId = await getUserId()
  await db.update(alerts).set({ resolved: true }).where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
  revalidatePath("/")
}
