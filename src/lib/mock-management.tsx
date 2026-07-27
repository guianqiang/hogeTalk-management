'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { initialMockDatabase, mockUsers, getWorkspacesForUser } from './mock-data'
import type {
  AccountMembership,
  AccountMembershipStatus,
  AuditEvent,
  ChamberMembership,
  ChamberMembershipStatus,
  Enterprise,
  MockDatabase,
  MockSession,
  Workspace,
  WorkspaceRole,
} from './types'

const DATABASE_KEY = 'hogetalk-management-mock-database-v2'
const SESSION_KEY = 'hogetalk-management-mock-session-v2'

interface NewEnterpriseInput {
  name: string
  shortName: string
  country: string
  region: string
  industry: string
  contactName: string
}

interface InviteAccountInput {
  workspaceId: string
  name: string
  account: string
  title: string
  role: WorkspaceRole
}

interface MockManagementContextValue {
  hydrated: boolean
  session: MockSession | null
  currentUser: (typeof mockUsers)[number] | null
  database: MockDatabase
  availableWorkspaces: Workspace[]
  login: (account: string, password: string) => boolean
  logout: () => void
  resetDemo: () => void
  createEnterprise: (workspaceId: string, input: NewEnterpriseInput) => Enterprise
  inviteAccount: (input: InviteAccountInput) => AccountMembership
  setAccountStatus: (workspaceId: string, membershipId: string, status: AccountMembershipStatus) => boolean
  setAccountRole: (workspaceId: string, membershipId: string, role: WorkspaceRole) => boolean
  setChamberMembershipStatus: (workspaceId: string, membershipId: string, status: ChamberMembershipStatus, reason?: string) => boolean
}

const MockManagementContext = createContext<MockManagementContextValue | null>(null)

function nowLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replaceAll('/', '-')
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`
}

export function MockManagementProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<MockDatabase>(initialMockDatabase)
  const [session, setSession] = useState<MockSession | null>(null)
  // Mock mode must remain usable even when browser storage is unavailable.
  // The real BFF session will replace this client hydration bridge.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const storedDatabase = window.localStorage.getItem(DATABASE_KEY)
      const storedSession = window.localStorage.getItem(SESSION_KEY)
      if (storedDatabase) setDatabase(JSON.parse(storedDatabase) as MockDatabase)
      if (storedSession) setSession(JSON.parse(storedSession) as MockSession)
    } catch {
      // Storage can be disabled by the browser. Continue with the in-memory demo.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database))
    } catch {
      // In-memory state remains fully usable when persistence is unavailable.
    }
  }, [database, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      else window.localStorage.removeItem(SESSION_KEY)
    } catch {
      // Login remains valid for the current tab even without persistence.
    }
  }, [session, hydrated])

  const currentUser = useMemo(
    () => mockUsers.find((item) => item.id === session?.userId) ?? null,
    [session],
  )

  const availableWorkspaces = useMemo(
    () => currentUser ? getWorkspacesForUser(currentUser.id) : [],
    [currentUser],
  )

  const login = useCallback((account: string, password: string) => {
    const user = mockUsers.find((item) => item.account.toLowerCase() === account.trim().toLowerCase())
    if (!user || password !== 'Hoge2026!') return false
    setSession({ userId: user.id, signedInAt: new Date().toISOString() })
    return true
  }, [])

  const logout = useCallback(() => setSession(null), [])

  const resetDemo = useCallback(() => {
    setDatabase(initialMockDatabase)
  }, [])

  const appendAudit = useCallback((
    current: MockDatabase,
    workspaceId: string,
    action: string,
    targetType: string,
    targetName: string,
    summary: string,
  ): AuditEvent[] => [{
    id: nextId('ae'),
    workspaceId,
    actorName: currentUser?.name ?? '演示用户',
    action,
    targetType,
    targetName,
    result: 'success',
    summary,
    createdAt: nowLabel(),
  }, ...current.auditEvents], [currentUser])

  const createEnterprise = useCallback((workspaceId: string, input: NewEnterpriseInput) => {
    const enterprise: Enterprise = {
      id: nextId('ent'),
      name: input.name,
      shortName: input.shortName || input.name,
      kind: 'company',
      status: 'pending',
      country: input.country,
      region: input.region,
      industry: input.industry,
      contactName: input.contactName,
      contactPhone: '待补充',
      memberCount: 1,
      chamberCount: 0,
      updatedAt: nowLabel().slice(0, 16),
    }
    setDatabase((current) => ({
      ...current,
      enterprises: [enterprise, ...current.enterprises],
      auditEvents: appendAudit(current, workspaceId, 'enterprise.create', '企业', enterprise.name, '创建企业主体，状态为待完善'),
    }))
    return enterprise
  }, [appendAudit])

  const inviteAccount = useCallback((input: InviteAccountInput) => {
    const membership: AccountMembership = {
      id: nextId('am'),
      workspaceId: input.workspaceId,
      name: input.name,
      account: input.account,
      title: input.title,
      role: input.role,
      status: 'active',
      joinedAt: new Date().toISOString().slice(0, 10),
      lastActiveAt: '尚未登录',
      version: 1,
    }
    setDatabase((current) => ({
      ...current,
      accountMemberships: [membership, ...current.accountMemberships],
      auditEvents: appendAudit(
        current,
        input.workspaceId,
        'membership.invite',
        '账号成员',
        membership.name,
        `邀请 ${membership.account} 加入工作空间，角色为 ${membership.role}`,
      ),
    }))
    return membership
  }, [appendAudit])

  const setAccountStatus = useCallback((workspaceId: string, membershipId: string, status: AccountMembershipStatus) => {
    let changed: AccountMembership | undefined
    setDatabase((current) => {
      const memberships = current.accountMemberships.map((item) => {
        if (item.id !== membershipId || item.workspaceId !== workspaceId) return item
        changed = { ...item, status, version: item.version + 1 }
        return changed
      })
      if (!changed) return current
      return {
        ...current,
        accountMemberships: memberships,
        auditEvents: appendAudit(current, workspaceId, `membership.${status}`, '账号成员', changed.name, `账号成员状态变更为 ${status}`),
      }
    })
    return Boolean(changed)
  }, [appendAudit])

  const setAccountRole = useCallback((workspaceId: string, membershipId: string, role: WorkspaceRole) => {
    let changed: AccountMembership | undefined
    setDatabase((current) => {
      const memberships = current.accountMemberships.map((item) => {
        if (item.id !== membershipId || item.workspaceId !== workspaceId) return item
        changed = { ...item, role, version: item.version + 1 }
        return changed
      })
      if (!changed) return current
      return {
        ...current,
        accountMemberships: memberships,
        auditEvents: appendAudit(
          current,
          workspaceId,
          'membership.role_change',
          '账号成员',
          changed.name,
          `账号成员角色变更为 ${role}`,
        ),
      }
    })
    return Boolean(changed)
  }, [appendAudit])

  const setChamberMembershipStatus = useCallback((
    workspaceId: string,
    membershipId: string,
    status: ChamberMembershipStatus,
    reason?: string,
  ) => {
    let changed: ChamberMembership | undefined
    setDatabase((current) => {
      const memberships = current.chamberMemberships.map((item) => {
        if (item.id !== membershipId) return item
        changed = {
          ...item,
          status,
          version: item.version + 1,
          joinedAt: status === 'active' ? (item.joinedAt ?? new Date().toISOString().slice(0, 10)) : item.joinedAt,
          expiresAt: status === 'active' ? (item.expiresAt ?? '2027-07-22') : item.expiresAt,
        }
        return changed
      })
      if (!changed) return current
      return {
        ...current,
        chamberMemberships: memberships,
        auditEvents: appendAudit(
          current,
          workspaceId,
          `chamber_membership.${status}`,
          '商会会员企业',
          changed.enterpriseName,
          status === 'rejected'
            ? `拒绝入会申请：${reason?.trim() || '未填写原因'}`
            : `商会会员关系状态变更为 ${status}`,
        ),
      }
    })
    return Boolean(changed)
  }, [appendAudit])

  const value = useMemo<MockManagementContextValue>(() => ({
    hydrated,
    session,
    currentUser,
    database,
    availableWorkspaces,
    login,
    logout,
    resetDemo,
    createEnterprise,
    inviteAccount,
    setAccountStatus,
    setAccountRole,
    setChamberMembershipStatus,
  }), [
    hydrated,
    session,
    currentUser,
    database,
    availableWorkspaces,
    login,
    logout,
    resetDemo,
    createEnterprise,
    inviteAccount,
    setAccountStatus,
    setAccountRole,
    setChamberMembershipStatus,
  ])

  return <MockManagementContext.Provider value={value}>{children}</MockManagementContext.Provider>
}

export function useMockManagement() {
  const value = useContext(MockManagementContext)
  if (!value) throw new Error('useMockManagement must be used inside MockManagementProvider')
  return value
}
