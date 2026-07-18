import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock3, FileCheck2, Scale, TrendingUp, UsersRound } from 'lucide-react'
import { getStats } from '../api'
import { PageHeader } from '../components/AppShell'
import { demoStats } from '../data/demo'
import type { DashboardStats } from '../types'

const weekly = [{ day: 'Mon', guided: 15, packs: 8 }, { day: 'Tue', guided: 22, packs: 11 }, { day: 'Wed', guided: 18, packs: 13 }, { day: 'Thu', guided: 28, packs: 17 }, { day: 'Fri', guided: 31, packs: 19 }, { day: 'Sat', guided: 9, packs: 5 }, { day: 'Sun', guided: 5, packs: 3 }]
const claimTypes = [{ name: 'Goods', value: 34 }, { name: 'Services', value: 27 }, { name: 'Money held', value: 21 }, { name: 'Damage', value: 12 }, { name: 'Other', value: 6 }]

export function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats>(demoStats)
  useEffect(() => { getStats().then(setStats) }, [])
  return <div className="page analytics-page"><PageHeader eyebrow="Program intelligence" title="Impact, without exposing people." copy="Aggregated operational insights—never case narratives or private evidence." />
    <section className="impact-stats"><article><UsersRound /><small>People guided</small><strong>{stats.impact.peopleGuided}</strong><span><TrendingUp />18% this month</span></article><article><FileCheck2 /><small>Action packs</small><strong>{stats.impact.packsCreated}</strong><span>59% completion</span></article><article><Clock3 /><small>Estimated hours saved</small><strong>{stats.impact.hoursSaved}</strong><span>4 hours per pack</span></article><article><Scale /><small>Median claim value</small><strong>KES 74k</strong><span>Across active claims</span></article></section>
    <section className="analytics-grid"><article className="card chart-card wide"><div className="card-title"><div><span className="section-label">Seven-day activity</span><h2>Guidance and completed packs</h2></div><span className="chart-legend"><i className="guided" />People guided <i className="packs" />Packs</span></div><div className="chart-wrap" role="img" aria-label="Area chart showing 128 people guided and 76 packs completed over seven days"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weekly}><defs><linearGradient id="guidedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f795d" stopOpacity={0.34} /><stop offset="100%" stopColor="#2f795d" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey="guided" stroke="#2f795d" strokeWidth={3} fill="url(#guidedGradient)" /><Area type="monotone" dataKey="packs" stroke="#c78b32" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer></div></article>
      <article className="card chart-card"><div className="card-title"><div><span className="section-label">Claim mix</span><h2>Where people need help</h2></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={claimTypes} layout="vertical" margin={{ left: 10 }}><CartesianGrid horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={78} /><Tooltip /><Bar dataKey="value" fill="#2f795d" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></article></section>
    <div className="card data-note"><ShieldCheckIcon /><p><strong>Privacy-preserving analytics</strong><span>Counts are aggregated and de-identified. Small cohorts are suppressed in production to reduce re-identification risk.</span></p></div>
  </div>
}

function ShieldCheckIcon() { return <span className="stat-icon green"><Scale /></span> }
