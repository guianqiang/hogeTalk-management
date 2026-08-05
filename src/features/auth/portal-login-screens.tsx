import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  LockKeyhole,
  Network,
  UsersRound,
} from 'lucide-react'
import { LoginScreen } from './login-screen'

const chamberConnections = [
  [Building2, '会员单位'],
  [CheckCircle2, '商会认证'],
  [UsersRound, '组织人员'],
] as const

const operatorScopes = ['企业认证审核', '内容发布管理', '平台协作处理'] as const

export function AdminLoginScreen() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(31,32,38,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(31,32,38,0.028)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute left-1/2 top-0 h-44 w-px bg-gradient-to-b from-ember-500/60 to-transparent" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-5 py-7 sm:px-10 lg:px-14 lg:py-10">
        <header className="border-b border-border/75 pb-5">
          <div>
            <p className="font-display text-[1.4rem] tracking-[-0.03em]">
              华盟<span className="text-ember-700">在线</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
              PLATFORM GOVERNANCE
            </p>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[456px] animate-fade-up">
            <div className="mb-5 flex items-center justify-center gap-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
              <span className="h-px w-10 bg-border" />
              <LockKeyhole className="h-3.5 w-3.5 text-ember-700" />
              受保护的管理入口
              <span className="h-px w-10 bg-border" />
            </div>
            <div className="product-surface bg-card/95 p-6 sm:p-9">
              <LoginScreen
                portal="admin"
                eyebrow="平台管理员"
                title="管理员登录"
                description="使用已开通的平台管理账号或已验证手机号登录。"
                submitLabel="进入管理后台"
              />
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-border/75 pt-5 text-[10px] tracking-[0.1em] text-muted-foreground">
          <span>HogeTalk · 华盟</span>
          <span>请仅在受信任的设备上登录</span>
        </footer>
      </div>
    </main>
  )
}

export function OperatorLoginScreen() {
  return (
    <main className="relative h-[100svh] overflow-hidden bg-paper-100">
      <div className="absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),transparent)]" />
      <div className="relative mx-auto flex h-full w-full max-w-[1500px] flex-col px-5 py-7 sm:px-10 lg:px-14 lg:py-8 [@media(max-height:700px)]:pb-2 [@media(max-height:720px)]:py-4">
        <header className="shrink-0 border-b border-border/80 pb-5 [@media(max-height:720px)]:pb-3">
          <div>
            <p className="font-display text-[1.35rem] tracking-[-0.025em]">
              华盟<span className="text-ember-700">在线</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.17em] text-muted-foreground">
              OPERATIONS DESK
            </p>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center py-6 lg:py-8 [@media(max-height:800px)]:py-4">
          <div className="mx-auto grid w-full max-w-[560px] animate-fade-up overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_22px_60px_rgba(31,32,38,0.11)] lg:max-w-[900px] lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="relative overflow-hidden bg-foreground px-5 py-4 text-paper-50 sm:px-8 sm:py-5 lg:flex lg:flex-col lg:justify-between lg:p-9 [@media(max-height:720px)]:lg:p-7">
              <span className="absolute inset-y-0 left-0 w-1 bg-ember-600" />

              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-paper-200">
                    <BarChart3 className="h-4 w-4 text-ember-400" />
                    内部运营入口
                  </div>
                  <span className="text-[10px] tracking-[0.12em] text-paper-300 lg:hidden">
                    OPERATIONS
                  </span>
                </div>

                <div className="hidden lg:block">
                  <h2 className="mt-7 font-display text-[36px] font-semibold tracking-[-0.03em] text-white">
                    运营工作台
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-paper-300">
                    集中处理平台日常运营事项，保持信息准确、流程清晰。
                  </p>
                </div>
              </div>

              <div className="hidden border-t border-white/15 pt-6 lg:block">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-paper-400">
                  工作范围
                </p>
                <ul className="mt-4 space-y-3" aria-label="运营工作范围">
                  {operatorScopes.map((scope) => (
                    <li key={scope} className="flex items-center gap-3 text-xs font-semibold text-paper-100">
                      <span className="h-px w-5 bg-ember-500" />
                      {scope}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="p-6 sm:p-8 lg:p-10 [@media(max-height:700px)]:p-4 [@media(max-height:720px)]:p-5">
              <LoginScreen
                portal="operator"
                eyebrow="运营账号"
                title="运营人员登录"
                description="使用已开通的平台运营账号或已验证手机号登录。"
                submitLabel="进入运营工作台"
              />
            </div>
          </div>
        </section>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-5 text-[10px] tracking-[0.1em] text-muted-foreground [@media(max-height:720px)]:pt-3">
          <span>连接企业 · 见证信用 · 促进协作</span>
          <span>HogeTalk Management</span>
        </footer>
      </div>
    </main>
  )
}

export function ChamberLoginScreen() {
  return (
    <main className="relative flex h-[100svh] flex-col overflow-hidden bg-paper-50 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(720px_460px_at_24%_48%,rgba(234,88,12,0.08),transparent_64%)]" />
      <header className="relative shrink-0 border-b border-border/80 bg-card/65">
        <div className="mx-auto max-w-[1380px] px-5 py-5 sm:px-10 lg:px-14">
          <div>
            <p className="font-display text-[1.4rem] tracking-[-0.025em]">
              华盟<span className="text-ember-700">在线</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
              CHAMBER NETWORK
            </p>
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid min-h-0 w-full max-w-[1380px] flex-1 items-center gap-12 px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-14 lg:py-14 xl:gap-24 [@media(max-height:720px)]:py-6">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-ember-800">
              <Network className="h-4 w-4" />
              组织连接网络
            </div>
            <h2 className="font-display text-[48px] font-semibold leading-[1.25] tracking-[-0.035em] xl:text-[58px]">
              让会员服务，
              <br />
              从一份可信名录开始。
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-8 text-muted-foreground">
              维护会员企业、记录商会认证、协同组织人员，让每一段会员关系都有清晰依据。
            </p>

            <div className="relative mt-12 grid max-w-xl grid-cols-3 border-y border-border/80 py-8">
              <span className="absolute left-[16.67%] right-[16.67%] top-[51px] h-px bg-ember-700/25" />
              {chamberConnections.map(([Icon, label]) => (
                <div key={label} className="relative flex flex-col items-center text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-ember-700/25 bg-paper-50 text-ember-800">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3 text-xs font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="animate-fade-up rounded-xl border border-border/80 bg-card p-6 shadow-[0_22px_65px_rgba(31,32,38,0.1)] sm:p-9">
          <LoginScreen
            portal="chamber"
            eyebrow="商会管理员"
            title="进入商会门户"
            description="使用所属商会开通的管理账号或已验证手机号登录。"
            submitLabel="进入商会门户"
          />
        </section>
      </div>
    </main>
  )
}

export function EnterpriseLoginScreen() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper-100 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(760px_460px_at_12%_18%,rgba(234,88,12,0.08),transparent_65%),linear-gradient(rgba(31,32,38,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(31,32,38,0.025)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-5 py-7 sm:px-10 lg:px-14 lg:py-10">
        <header className="flex items-center justify-between border-b border-border/75 pb-5">
          <div>
            <p className="font-display text-[1.4rem] tracking-[-0.03em]">
              华盟<span className="text-ember-700">在线</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
              ENTERPRISE WORKSPACE
            </p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <BriefcaseBusiness className="h-4 w-4 text-ember-700" />
            企业业务入口
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="grid w-full max-w-[920px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_24px_70px_rgba(31,32,38,0.1)] lg:grid-cols-[minmax(0,1fr)_450px]">
            <aside className="hidden bg-foreground p-10 text-paper-50 lg:flex lg:flex-col lg:justify-between">
              <div>
                <BriefcaseBusiness className="h-7 w-7 text-ember-400" />
                <h2 className="mt-8 font-display text-[38px] font-semibold tracking-[-0.035em] text-white">
                  企业工作台
                </h2>
                <p className="mt-4 text-sm leading-7 text-paper-300">
                  集中管理企业供需、合作咨询与对外 AI 名片，账号权限由平台统一配置。
                </p>
              </div>
              <p className="border-t border-white/15 pt-6 text-[11px] leading-6 text-paper-400">
                一个账号对应一个企业，登录后直接进入已授权的企业工作台。
              </p>
            </aside>
            <div className="p-6 sm:p-9 lg:p-10">
              <LoginScreen
                portal="enterprise"
                eyebrow="企业账号"
                title="登录企业工作台"
                description="使用平台已开通的企业账号或已验证手机号登录。"
                submitLabel="进入企业工作台"
              />
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-border/75 pt-5 text-[10px] tracking-[0.1em] text-muted-foreground">
          <span>HogeTalk · 华盟</span>
          <span>企业数据安全受权限范围保护</span>
        </footer>
      </div>
    </main>
  )
}
