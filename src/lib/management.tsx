'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createChamberEnterpriseImport,
  getChamberEnterpriseImport,
  getManagementMe,
  listChamberAffiliations,
  listChamberCertifications,
  listChamberImportCandidates,
  loginManagement,
  logoutManagement,
  switchManagementWorkspace,
} from '@/api/client/management'
import {
  mapAffiliation,
  mapCandidate,
  mapCertification,
  mapImportJob,
  mapWorkspace,
} from '@/api/mappers/management'
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
  login: (phone: string, countryCode: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<void>
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

export function ManagementProvider({ children }: { children: React.ReactNode }) {
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
      const [affiliations, certifications, candidates] = await Promise.all([
        listChamberAffiliations(workspaceId),
        listChamberCertifications(workspaceId),
        listChamberImportCandidates(workspaceId),
      ])
      setWorkspaceData((current) => ({
        ...current,
        [workspaceId]: {
          affiliations: affiliations.map(mapAffiliation),
          certifications: certifications.map(mapCertification),
          candidates: candidates.map(mapCandidate),
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
          error: error instanceof Error ? error.message : '工作空间数据加载失败',
        },
      }))
      throw error
    }
  }, [availableWorkspaces])

  const bootstrap = useCallback(async (displayName?: string) => {
    const me = await getManagementMe()
    const workspaces = me.workspaces.map(mapWorkspace)
    setCurrentUser(userFromAccount(me.account_id, displayName))
    setAvailableWorkspaces(workspaces)
    setPreferredWorkspaceId(me.preferred_workspace_id)
    setHydrated(true)
    return { me, workspaces }
  }, [])

  useEffect(() => {
    let active = true
    void getManagementMe()
      .then((me) => {
        if (!active) return
        setCurrentUser(userFromAccount(
          me.account_id,
          fallbackDisplayName(me.workspaces[0]?.role_template),
        ))
        setAvailableWorkspaces(me.workspaces.map(mapWorkspace))
        setPreferredWorkspaceId(me.preferred_workspace_id)
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
  }, [])

  const login = useCallback(async (phone: string, countryCode: string, password: string) => {
    const result = await loginManagement(phone, countryCode, password)
    await bootstrap(result.account.display_name)
  }, [bootstrap])

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
    const me = await switchManagementWorkspace(workspaceId)
    setAvailableWorkspaces(me.workspaces.map(mapWorkspace))
    setPreferredWorkspaceId(me.preferred_workspace_id)
  }, [])

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
