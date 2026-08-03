'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  createChamberEnterpriseImport,
  getChamberEnterpriseImport,
  getManagementMe,
  listCurrentChamberEnterprises,
  loginManagement,
  logoutManagement,
} from '@/api/client/management'
import { getManagementAccount } from '@/api/client/scaffolded-management'
import {
  mapCurrentChamberAffiliation,
  mapCurrentChamberCertification,
  mapImportJob,
  mapWorkspace,
} from '@/api/mappers/management'
import type {
  ManagementPasswordChangeRequiredDto,
} from '@/api/generated/huameng'
import type {
  CreateEnterpriseImportInput,
  ImportJob,
  ManagementUser,
  Workspace,
  WorkspaceSnapshot,
} from './types'

const emptySnapshot: WorkspaceSnapshot = {
  affiliations: [],
  certifications: [],
  candidates: [],
  importJobs: [],
  loading: false,
  error: null,
  updatedAt: null,
}

interface ManagementContextValue {
  hydrated: boolean
  currentUser: ManagementUser | null
  availableWorkspaces: Workspace[]
  preferredWorkspaceId: string | null
  workspaceData: Record<string, WorkspaceSnapshot>
  login: (
    identifier: string,
    countryCode: string,
    password: string,
  ) => Promise<ManagementPasswordChangeRequiredDto | null>
  logout: () => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshAccount: () => Promise<void>
  refreshWorkspace: (workspaceId: string) => Promise<void>
  createEnterpriseImport: (workspaceId: string, input: CreateEnterpriseImportInput) => Promise<ImportJob>
  refreshImportJob: (workspaceId: string, jobId: string) => Promise<ImportJob>
}

const ManagementContext = createContext<ManagementContextValue | null>(null)

function userFromAccount(accountId: string, displayName = '管理账号'): ManagementUser {
  const normalizedName = displayName.trim() || '管理账号'
  return {
    id: accountId,
    name: normalizedName,
    account: accountId,
    avatarText: normalizedName.slice(0, 1),
  }
}

function fallbackDisplayName(
  role: 'platform_admin' | 'platform_operator' | 'chamber_admin' | undefined,
) {
  if (role === 'platform_admin') return '华盟平台管理员'
  if (role === 'platform_operator') return '华盟平台运营员'
  if (role === 'chamber_admin') return '商会管理员'
  return '管理账号'
}

export function managementAccountDisplayName(
  account: Record<string, unknown> | null,
  fallback: string,
) {
  const displayName = account?.display_name
  return typeof displayName === 'string' && displayName.trim()
    ? displayName.trim()
    : fallback
}

export function ManagementProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [currentUser, setCurrentUser] = useState<ManagementUser | null>(null)
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([])
  const [preferredWorkspaceId, setPreferredWorkspaceId] = useState<string | null>(null)
  const [workspaceData, setWorkspaceData] = useState<Record<string, WorkspaceSnapshot>>({})

  const refreshWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = availableWorkspaces.find((item) => item.id === workspaceId)
    if (workspace?.kind === 'platform') {
      setWorkspaceData((current) => ({
        ...current,
        [workspaceId]: {
          ...(current[workspaceId] ?? emptySnapshot),
          loading: false,
          error: null,
          updatedAt: new Date().toISOString(),
        },
      }))
      return
    }

    setWorkspaceData((current) => ({
      ...current,
      [workspaceId]: {
        ...(current[workspaceId] ?? emptySnapshot),
        loading: true,
        error: null,
      },
    }))
    try {
      const enterprises = await listCurrentChamberEnterprises()
      setWorkspaceData((current) => ({
        ...current,
        [workspaceId]: {
          affiliations: enterprises.map(mapCurrentChamberAffiliation),
          certifications: enterprises
            .map(mapCurrentChamberCertification)
            .filter((item): item is NonNullable<typeof item> => item !== null),
          candidates: [],
          importJobs: current[workspaceId]?.importJobs ?? [],
          loading: false,
          error: null,
          updatedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      setWorkspaceData((current) => ({
        ...current,
        [workspaceId]: {
          ...(current[workspaceId] ?? emptySnapshot),
          loading: false,
          error: error instanceof Error ? error.message : '当前组织数据加载失败',
        },
      }))
      throw error
    }
  }, [availableWorkspaces])

  const bootstrap = useCallback(async () => {
    const [me, account] = await Promise.all([
      getManagementMe(),
      getManagementAccount().catch(() => null),
    ])
    const workspaces = [mapWorkspace(me.enterprise)]
    setCurrentUser(userFromAccount(
      me.account_id,
      managementAccountDisplayName(
        account,
        fallbackDisplayName(me.enterprise.role_template),
      ),
    ))
    setAvailableWorkspaces(workspaces)
    setPreferredWorkspaceId(me.enterprise.enterprise_id)
    setHydrated(true)
    return { me, workspaces }
  }, [])

  useEffect(() => {
    if (pathname === '/login' || pathname.endsWith('/login')) {
      setCurrentUser(null)
      setAvailableWorkspaces([])
      setPreferredWorkspaceId(null)
      setHydrated(true)
      return
    }
    let active = true
    void Promise.all([
      getManagementMe(),
      getManagementAccount().catch(() => null),
    ])
      .then(([me, account]) => {
        if (!active) return
        setCurrentUser(userFromAccount(
          me.account_id,
          managementAccountDisplayName(
            account,
            fallbackDisplayName(me.enterprise.role_template),
          ),
        ))
        setAvailableWorkspaces([mapWorkspace(me.enterprise)])
        setPreferredWorkspaceId(me.enterprise.enterprise_id)
      })
      .catch(() => {
        if (!active) return
        setCurrentUser(null)
        setAvailableWorkspaces([])
        setPreferredWorkspaceId(null)
      })
      .finally(() => {
        if (active) setHydrated(true)
      })
    return () => {
      active = false
    }
  }, [pathname])

  const login = useCallback(async (identifier: string, countryCode: string, password: string) => {
    const result = await loginManagement(identifier, countryCode, password)
    if ('next_step' in result) return result
    await bootstrap()
    return null
  }, [bootstrap])

  const refreshAccount = useCallback(async () => {
    const account = await getManagementAccount()
    setCurrentUser((current) => current
      ? userFromAccount(
        current.id,
        managementAccountDisplayName(account, current.name),
      )
      : current)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutManagement()
    } finally {
      setCurrentUser(null)
      setAvailableWorkspaces([])
      setPreferredWorkspaceId(null)
      setWorkspaceData({})
      setHydrated(true)
    }
  }, [])

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    const enterprise = availableWorkspaces[0]
    if (!enterprise || enterprise.id !== workspaceId) {
      throw new Error('当前账号仅可进入其唯一管理企业')
    }
    setPreferredWorkspaceId(enterprise.id)
  }, [availableWorkspaces])

  const createEnterpriseImport = useCallback(async (
    workspaceId: string,
    input: CreateEnterpriseImportInput,
  ) => {
    const job = mapImportJob(await createChamberEnterpriseImport(workspaceId, {
      file: input.file,
      certificationLevelCode: input.certificationLevelCode,
      validDays: input.validDays,
    }))
    setWorkspaceData((current) => ({
      ...current,
      [workspaceId]: {
        ...(current[workspaceId] ?? emptySnapshot),
        importJobs: [
          job,
          ...(current[workspaceId]?.importJobs ?? []).filter((item) => item.jobId !== job.jobId),
        ],
      },
    }))
    return job
  }, [])

  const refreshImportJob = useCallback(async (workspaceId: string, jobId: string) => {
    const job = mapImportJob(await getChamberEnterpriseImport(workspaceId, jobId))
    setWorkspaceData((current) => ({
      ...current,
      [workspaceId]: {
        ...(current[workspaceId] ?? emptySnapshot),
        importJobs: [
          job,
          ...(current[workspaceId]?.importJobs ?? []).filter((item) => item.jobId !== job.jobId),
        ],
      },
    }))
    if (['completed', 'partial_failed', 'failed'].includes(job.status)) {
      await refreshWorkspace(workspaceId)
    }
    return job
  }, [refreshWorkspace])

  const value = useMemo<ManagementContextValue>(() => ({
    hydrated,
    currentUser,
    availableWorkspaces,
    preferredWorkspaceId,
    workspaceData,
    login,
    logout,
    switchWorkspace,
    refreshAccount,
    refreshWorkspace,
    createEnterpriseImport,
    refreshImportJob,
  }), [
    availableWorkspaces,
    createEnterpriseImport,
    currentUser,
    hydrated,
    login,
    logout,
    preferredWorkspaceId,
    refreshAccount,
    refreshImportJob,
    refreshWorkspace,
    switchWorkspace,
    workspaceData,
  ])

  return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>
}

export function useManagement() {
  const context = useContext(ManagementContext)
  if (!context) throw new Error('useManagement must be used inside ManagementProvider')
  return context
}
