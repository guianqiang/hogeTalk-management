import Link from 'next/link'
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Landmark,
  ShieldCheck,
} from 'lucide-react'
import { loginPortals, type LoginPortal } from './login-portals'

const portalStyles: Record<LoginPortal, {
  icon: typeof ShieldCheck
  number: string
  accent: string
  hover: string
}> = {
  admin: {
    icon: ShieldCheck,
    number: '01',
    accent: 'text-ember-700',
    hover: 'hover:border-ember-300 hover:bg-ember-50/65',
  },
  operator: {
    icon: BarChart3,
    number: '02',
    accent: 'text-ember-700',
    hover: 'hover:border-ember-300 hover:bg-ember-50/65',
  },
  chamber: {
    icon: Landmark,
    number: '03',
    accent: 'text-ember-700',
    hover: 'hover:border-ember-300 hover:bg-ember-50/65',
  },
  enterprise: {
    icon: BriefcaseBusiness,
    number: '04',
    accent: 'text-ember-700',
    hover: 'hover:border-ember-300 hover:bg-ember-50/65',
  },
}

export function LoginPortalSelector() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f1ea] text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(800px_460px_at_85%_10%,rgba(234,88,12,0.07),transparent_62%),radial-gradient(700px_400px_at_8%_88%,rgba(31,32,38,0.035),transparent_65%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-5 py-7 sm:px-10 lg:px-14 lg:py-10">
        <header className="flex items-center justify-between border-b border-border/80 pb-5">
          <div>
            <p className="font-display text-[1.45rem] tracking-[-0.03em]">
              华盟<span className="text-ember-600">在线</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">MANAGEMENT ACCESS</p>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">请选择与你账号一致的管理入口</p>
        </header>

        <section className="my-auto py-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-ember-700">登录入口</p>
            <h1 className="mt-5 font-display text-[40px] font-semibold leading-tight tracking-[-0.035em] sm:text-[52px]">
              你今天要进入哪一个工作台？
            </h1>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              四个入口共用同一账号体系，登录后仍以账号的真实角色和授权范围为准。
            </p>
          </div>

          <div className="mt-10 grid border-y border-border/80 sm:grid-cols-2 lg:grid-cols-4">
            {loginPortals.map((portal, index) => {
              const style = portalStyles[portal.id]
              const Icon = style.icon
              return (
                <Link
                  key={portal.id}
                  href={portal.href}
                  className={`group relative min-h-[250px] border-b border-border/80 p-6 transition-[background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:border-r lg:border-b-0 lg:p-7 ${index % 2 === 1 ? 'sm:border-r-0' : ''} ${index < loginPortals.length - 1 ? 'lg:border-r' : 'lg:border-r-0'} ${style.hover}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`font-data text-[11px] font-semibold ${style.accent}`}>{style.number}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <Icon className={`mt-10 h-7 w-7 ${style.accent}`} />
                  <p className="mt-5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">{portal.eyebrow}</p>
                  <h2 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.02em]">{portal.title}</h2>
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">{portal.description}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-5 text-[10px] tracking-[0.1em] text-muted-foreground">
          <span>HogeTalk · 华盟</span>
          <span>请仅在受信任的设备上登录</span>
        </footer>
      </div>
    </main>
  )
}
