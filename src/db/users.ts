import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { profiles } from './schema.ts';

const ADMIN_EMAILS = new Set([
  'admin@freshcart.com',
  'amankushwaha3328@gmail.com',
]);

export type ProfileRecord = typeof profiles.$inferSelect;

export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  fullName?: string
): Promise<ProfileRecord> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, normalizedEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const existing = existingByEmail[0];
      const updatedRole = ADMIN_EMAILS.has(normalizedEmail)
        ? 'admin'
        : existing.role;
      const result = await db
        .update(profiles)
        .set({
          uid,
          emailVerified: true,
          role: updatedRole,
          fullName: existing.fullName || fullName || normalizedEmail.split('@')[0],
        })
        .where(eq(profiles.id, existing.id))
        .returning();
      return result[0];
    }

    const role = ADMIN_EMAILS.has(normalizedEmail) ? 'admin' : 'customer';
    const result = await db
      .insert(profiles)
      .values({
        uid,
        email: normalizedEmail,
        fullName: fullName?.trim() || normalizedEmail.split('@')[0],
        role,
        emailVerified: true,
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email: normalizedEmail,
          emailVerified: true,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateFirebaseUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function findProfileById(id: number): Promise<ProfileRecord | null> {
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in findProfileById:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}

export async function findProfileByEmail(
  email: string
): Promise<ProfileRecord | null> {
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in findProfileByEmail:', error);
    throw new Error('Failed to look up account.', { cause: error });
  }
}
