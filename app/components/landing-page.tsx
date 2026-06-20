import {
  IconAlert,
  IconChart,
  IconDocument,
  IconHistory,
  IconLogo,
  IconShield,
  IconTerminal,
} from "./dashboard-icons";
import { LandingNav } from "./landing-nav";
import Link from "next/link";

type LandingPageProps = {
  isAuthenticated: boolean;
};

const FEATURES = [
  {
    icon: IconTerminal,
    title: "智能日志分析",
    description:
      "支持 MySQL、K8s、Kafka、Nginx 等日志自动识别，输出错误原因、影响范围、修复建议与风险等级。",
    accent: "from-sky-500/20 to-sky-500/5",
    iconColor: "text-sky-400",
    href: "/log-analyzer",
    span: "lg:col-span-2",
  },
  {
    icon: IconAlert,
    title: "错误解释器",
    description: "堆栈与异常信息 AI 解读，多轮追问深入排查。",
    accent: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    href: "/error-explainer",
    span: "",
  },
  {
    icon: IconDocument,
    title: "运维日报",
    description: "日志一键生成结构化日报，暂存恢复 + PDF 导出。",
    accent: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    href: "/daily-report",
    span: "",
  },
  {
    icon: IconChart,
    title: "数据 Dashboard",
    description: "分析统计可视化，类型分布一目了然，可导出统计报告。",
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    href: "/dashboard",
    span: "",
  },
  {
    icon: IconHistory,
    title: "分析历史",
    description: "自动保存至 Supabase，完整保留追问过程。",
    accent: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
    href: "/history",
    span: "",
  },
  {
    icon: IconShield,
    title: "PDF 报告导出",
    description: "各模块一键导出含分析时间、输入与 AI 结论的专业 PDF。",
    accent: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-400",
    href: "/log-analyzer",
    span: "lg:col-span-2",
  },
] as const;

const WORKFLOW = [
  {
    step: "01",
    title: "输入日志或报错",
    body: "粘贴文本、上传 .log 文件，或 Ctrl+V 粘贴截图，支持多模态组合分析。",
  },
  {
    step: "02",
    title: "AI 结构化分析",
    body: "大模型按运维 Prompt 输出结论：根因、影响、修复步骤、风险等级。",
  },
  {
    step: "03",
    title: "追问 · 归档 · 导出",
    body: "继续对话深挖细节，记录自动入库，一键导出 PDF 报告。",
  },
] as const;

const TECH_PILLS = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS 4",
  "Supabase",
  "PostgreSQL",
  "OpenRouter",
  "OpenAI",
  "jsPDF",
  "App Router",
] as const;

function ProductMockup() {
  return (
    <div className="landing-mockup relative">
      <div className="landing-mockup-glow pointer-events-none absolute -inset-4 rounded-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1219] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#080c10] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/90" />
          <span className="h-3 w-3 rounded-full bg-amber-500/90" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/90" />
          <span className="ml-2 font-mono text-[11px] text-slate-500">
            localhost:3000/log-analyzer
          </span>
        </div>
        <div className="grid min-h-[320px] lg:grid-cols-2">
          <div className="border-b border-white/5 p-4 lg:border-b-0 lg:border-r">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              日志输入
            </p>
            <div className="log-editor rounded-lg p-3 text-[11px] leading-relaxed text-emerald-400/90">
              <span className="text-slate-600">[2026-06-15 14:32:01] </span>
              ERROR nginx: connect() failed
              <br />
              <span className="text-slate-600">[2026-06-15 14:32:02] </span>
              upstream timed out (110: Connection timed out)
              <br />
              <span className="text-slate-600">[2026-06-15 14:32:03] </span>
              client: 10.0.1.42, server: api.internal
              <br />
              <span className="text-amber-400/90">▌</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
              AI 分析报告
            </p>
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="font-semibold text-emerald-400">错误原因</p>
                <p className="mt-1 text-slate-400">
                  上游服务 api.internal 连接超时，nginx 无法建立 upstream 连接。
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/80 bg-slate-800/30 p-3">
                <p className="font-semibold text-sky-400">修复建议</p>
                <p className="mt-1 text-slate-400">
                  检查 upstream 健康状态、防火墙规则及服务端口监听。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                  风险：高
                </span>
                <span className="status-dot status-dot--live" />
                <span className="text-[10px] text-slate-500">分析完成</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const primaryHref = isAuthenticated ? "/dashboard" : "/login";
  const primaryLabel = isAuthenticated ? "进入控制台" : "免费开始使用";

  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden">
      <div className="landing-orb landing-orb--emerald pointer-events-none absolute -left-32 top-20 h-[480px] w-[480px]" />
      <div className="landing-orb landing-orb--cyan pointer-events-none absolute -right-32 top-60 h-[400px] w-[400px]" />

      <LandingNav
        isAuthenticated={isAuthenticated}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
      />

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-32">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="landing-fade-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
                <span className="status-dot status-dot--live" />
                面向运维与 SRE 的 AI 智能平台
              </div>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl xl:text-6xl">
                用 AI 加速
                <span className="mt-1 block bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  运维故障排查
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                AI Analyzer 将日志分析、错误解释、日报生成与数据统计整合于一体。
                帮助运维团队分钟级定位问题、自动生成报告、沉淀可检索的分析历史。
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={primaryHref}
                  className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_32px_rgba(16,185,129,0.3)]"
                >
                  {primaryLabel}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600/80 bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-white/[0.06]"
                >
                  浏览功能
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 border-t border-white/5 pt-8">
                {[
                  { n: "4+", l: "核心模块" },
                  { n: "AI", l: "多模态分析" },
                  { n: "PDF", l: "报告导出" },
                  { n: "24/7", l: "值班优化" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-2xl font-bold text-white">{s.n}</p>
                    <p className="text-xs text-slate-500">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-fade-up landing-fade-up--delay">
              <ProductMockup />
            </div>
          </div>
        </section>

        {/* 信任条 */}
        <section className="border-y border-white/5 bg-white/[0.02] py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-center sm:px-6 lg:px-8">
            {["结构化 AI 输出", "Supabase 持久化", "会话自动缓存", "OpenRouter / OpenAI"].map(
              (tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium uppercase tracking-widest text-slate-500"
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </section>

        {/* 项目介绍 */}
        <section id="intro" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
                About
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                项目介绍
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-400">
                AI Analyzer 是专为运维工程师与 SRE 团队打造的智能分析平台。
                基于大语言模型，将日志排查、报错解读与日报撰写自动化，
                让每一次值班都有据可查、有报告可交。
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "为值班场景设计",
                  body: "深色主题、终端风格输入、实时状态指示，长时间盯屏也不疲劳。",
                },
                {
                  n: "02",
                  title: "结构化 AI 输出",
                  body: "按错误原因、影响范围、修复步骤、风险等级组织结论，拒绝空泛回答。",
                },
                {
                  n: "03",
                  title: "知识可沉淀",
                  body: "分析自动入库、导航切换自动缓存、PDF 一键导出，经验不再随班次流失。",
                },
              ].map((item) => (
                <div
                  key={item.n}
                  className="landing-intro-card group rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-8 transition-all hover:border-emerald-500/20 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]"
                >
                  <span className="font-mono text-3xl font-bold text-emerald-500/30 group-hover:text-emerald-500/50">
                    {item.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 功能 Bento */}
        <section id="features" className="border-t border-white/5 bg-[#080c10]/50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
                Features
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                功能特性
              </h2>
              <p className="mt-6 text-lg text-slate-400">
                四大核心模块 + 历史追溯与 PDF 导出，覆盖运维日常分析全流程。
              </p>
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className={`group landing-feature-card relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d1219] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-xl ${feature.span}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                    />
                    <div className="relative">
                      <div
                        className={`mb-4 inline-flex rounded-xl border border-white/10 bg-white/5 p-3 ${feature.iconColor}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {feature.description}
                      </p>
                      <span
                        className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${feature.iconColor}`}
                      >
                        立即体验
                        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* 使用流程 */}
        <section id="workflow" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
                Workflow
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                三步完成分析
              </h2>
            </div>
            <div className="relative mt-16 grid gap-8 md:grid-cols-3">
              <div className="landing-workflow-line pointer-events-none absolute left-0 right-0 top-12 hidden h-px md:block" />
              {WORKFLOW.map((item) => (
                <div key={item.step} className="relative text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-transparent">
                    <span className="font-mono text-2xl font-bold text-emerald-400">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 技术栈 */}
        <section id="tech" className="border-t border-white/5 bg-[#080c10]/50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
                  Tech Stack
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  现代全栈架构
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-slate-400">
                  Next.js App Router + Supabase 提供认证与数据持久化，
                  OpenRouter / OpenAI 驱动多模态 AI 分析，TypeScript 全栈类型安全。
                </p>
                <dl className="mt-10 space-y-6">
                  {[
                    {
                      dt: "前端",
                      dd: "Next.js 16 · React 19 · Tailwind CSS 4 · 深色运维主题",
                    },
                    {
                      dt: "后端与数据",
                      dd: "Supabase Auth · PostgreSQL · Route Handlers · RLS",
                    },
                    {
                      dt: "AI 与导出",
                      dd: "OpenRouter / OpenAI · 视觉模型 · jsPDF · html2canvas",
                    },
                  ].map((row) => (
                    <div key={row.dt}>
                      <dt className="text-sm font-semibold text-emerald-400">{row.dt}</dt>
                      <dd className="mt-1 text-sm text-slate-400">{row.dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="flex flex-wrap gap-3">
                {TECH_PILLS.map((pill) => (
                  <span
                    key={pill}
                    className="landing-tech-pill rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="landing-cta relative overflow-hidden rounded-3xl border border-emerald-500/20 px-6 py-16 text-center sm:px-12 sm:py-20">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan-500/10" />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  准备好提升值班效率了吗？
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
                  注册即可使用全部功能，分析记录自动保存，随时回溯历史、导出 PDF 报告。
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={primaryHref}
                    className="btn-primary inline-flex w-full items-center justify-center rounded-xl px-10 py-4 text-sm font-bold text-white sm:w-auto"
                  >
                    {primaryLabel}
                  </Link>
                  {!isAuthenticated && (
                    <Link
                      href="/login"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-10 py-4 text-sm font-semibold text-slate-200 hover:bg-white/5 sm:w-auto"
                    >
                      已有账号，登录
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#080c10] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <IconLogo className="h-8 w-8" />
                <div>
                  <p className="font-bold text-white">AI Analyzer</p>
                  <p className="text-xs text-slate-500">Ops Intelligence Platform</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                面向运维与 SRE 的 AI 智能分析平台，让故障排查更快、报告更规范、知识可沉淀。
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                产品
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                <li><Link href="/log-analyzer" className="hover:text-emerald-400">日志分析</Link></li>
                <li><Link href="/error-explainer" className="hover:text-emerald-400">错误解释</Link></li>
                <li><Link href="/daily-report" className="hover:text-emerald-400">运维日报</Link></li>
                <li><Link href="/dashboard" className="hover:text-emerald-400">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                链接
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                <li><a href="#intro" className="hover:text-emerald-400">项目介绍</a></li>
                <li><a href="#features" className="hover:text-emerald-400">功能特性</a></li>
                <li><a href="#tech" className="hover:text-emerald-400">技术栈</a></li>
                <li><Link href="/login" className="hover:text-emerald-400">登录</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} AI Analyzer · Built with Next.js & Supabase
          </div>
        </div>
      </footer>
    </div>
  );
}
