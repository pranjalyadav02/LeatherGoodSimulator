export type UserRole = 'admin' | 'customer'

export interface UserSession {
  id: string
  email: string
  fullName: string
  role: UserRole
  title?: string
  token?: string
}

const STORAGE_KEY = 'atelier_user_session'

export const DEFAULT_ADMIN_USER: UserSession = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'admin@carrytote.in',
  fullName: 'Master Craftsman Rajesh K.',
  role: 'admin',
  title: 'Head of Bespoke Workshop',
}

export const DEFAULT_CUSTOMER_USER: UserSession = {
  id: 'c0000000-0000-0000-0000-000000000002',
  email: 'ananya.sharma@example.com',
  fullName: 'Ananya Sharma',
  role: 'customer',
  title: 'Bespoke Patron',
}

export function getCurrentSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserSession
  } catch {
    return null
  }
}

export function saveSession(session: UserSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear session:', err)
  }
}
