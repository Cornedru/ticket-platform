import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend
} from 'recharts'

const API_URL = ''

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
    const text = await response.text()
    if (!text) throw new Error('Empty response')
    const data = JSON.parse(text)
    if (!response.ok) throw new Error(data.error || 'Request failed')
    return data
  },
  get: (ep) => api.request(ep),
}

function TrendBadge({ value }) {
  if (value === null || value === undefined) return null
  const up = value >= 0
  return (
    <span className={`trend-badge ${up ? 'trend-up' : 'trend-down'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

function KpiCard({ label, value, trend, sub, accent }) {
  return (
    <div className={`kpi-card ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <TrendBadge value={trend} />
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

const customTooltipStyle = {
  backgroundColor: 'rgba(5,5,8,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.85rem',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={customTooltipStyle}>
      <p style={{ padding: '8px 12px 4px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ padding: '4px 12px', color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : p.value}</p>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [chartType, setChartType] = useState('revenue')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/api/v1/admin/analytics/overview?days=${period}`),
      api.get(`/api/v1/admin/analytics/logs?days=${period}`)
    ]).then(([overview, logs]) => {
      setData({ ...overview, logs: logs.logs || [] })
    }).catch(console.error).finally(() => setLoading(false))
  }, [period])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/v1/admin/analytics/export/csv', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trip-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err) } finally { setExporting(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
      <div className="spinner" />
    </div>
  )
  if (!data) return <div className="alert alert-error">Impossible de charger les analytics</div>

  const { kpis, timeSeries, topEvents, logs } = data
  const fmt = (n) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) || '0'
  const fmtEur = (n) => `${n?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}€`

  const getLogIcon = (type) => {
    const icons = { ORDER: '🎫', USER: '👤', EVENT: '📅', TICKET: '🎟️', PAYMENT: '💳', WAITLIST: '⏳' }
    return icons[type] || '📌'
  }

  const getLogColor = (type) => {
    const colors = {
      ORDER: 'var(--electric-magenta)',
      USER: 'var(--psycho-cyan)',
      EVENT: 'var(--acid-green)',
      TICKET: 'var(--hot-orange)',
      PAYMENT: 'var(--neon-purple)',
      WAITLIST: 'var(--color-warning)'
    }
    return colors[type] || 'var(--glass-border)'
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2 className="analytics-title">Analytics</h2>
        <div className="analytics-controls">
          <div className="period-tabs">
            {[['7','7j'],['30','30j'],['90','90j']].map(([v, l]) => (
              <button key={v} className={`period-tab ${period === v ? 'active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? '⏳' : '↓'} Export CSV
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Revenus" value={fmtEur(kpis.revenue.current)} trend={kpis.revenue.trend} sub={`Total: ${fmtEur(kpis.revenue.total)}`} accent />
        <KpiCard label="Commandes" value={fmt(kpis.orders.current)} trend={kpis.orders.trend} sub={`Total: ${fmt(kpis.orders.total)}`} />
        <KpiCard label="Billets vendus" value={fmt(kpis.tickets.current)} trend={kpis.tickets.trend} sub={`Total: ${fmt(kpis.tickets.total)}`} />
        <KpiCard label="Panier moyen" value={fmtEur(kpis.avgOrderValue.current)} trend={kpis.avgOrderValue.trend} />
        <KpiCard label="Utilisateurs actifs" value={fmt(kpis.activeUsers?.current || 0)} trend={kpis.activeUsers?.trend} sub={`Total: ${fmt(kpis.activeUsers?.total || 0)}`} />
        <KpiCard label="Taux de conversion" value={`${kpis.conversionRate.global}%`} />
        <KpiCard label="Transferts billets" value={`${kpis.transfers.count}`} sub={`Taux: ${kpis.transfers.rate}%`} />
        <KpiCard label="Liste d'attente" value={fmt(kpis.waitlist?.count || 0)} />
      </div>

      <div className="analytics-row">
        <div className="chart-card" style={{ flex: 2 }}>
          <div className="chart-card-header">
            <h3 className="chart-title">Évolution</h3>
            <div className="chart-type-tabs">
              <button className={`chart-tab ${chartType === 'revenue' ? 'active' : ''}`} onClick={() => setChartType('revenue')}>Revenus</button>
              <button className={`chart-tab ${chartType === 'orders' ? 'active' : ''}`} onClick={() => setChartType('orders')}>Commandes</button>
              <button className={`chart-tab ${chartType === 'tickets' ? 'active' : ''}`} onClick={() => setChartType('tickets')}>Billets</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF00FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#39FF14" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#39FF14" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FFFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => chartType === 'revenue' ? `${v}€` : v} width={50} />
              <Tooltip content={<CustomTooltip />} />
              {chartType === 'revenue'
                ? <Area type="monotone" dataKey="revenue" name="Revenus (€)" stroke="#FF00FF" strokeWidth={2} fill="url(#gradRevenue)" />
                : chartType === 'orders'
                  ? <Area type="monotone" dataKey="orders" name="Commandes" stroke="#39FF14" strokeWidth={2} fill="url(#gradOrders)" />
                  : <Area type="monotone" dataKey="tickets" name="Billets" stroke="#00FFFF" strokeWidth={2} fill="url(#gradTickets)" />
              }
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ flex: 1, minWidth: 280 }}>
          <div className="chart-card-header">
            <h3 className="chart-title">Activité récente</h3>
          </div>
          <div className="activity-log">
            {logs?.slice(0, 10).map((log, i) => (
              <div key={i} className="activity-item" style={{ borderLeftColor: getLogColor(log.type) }}>
                <span className="activity-icon">{getLogIcon(log.type)}</span>
                <div className="activity-content">
                  <p className="activity-message">{log.message}</p>
                  <span className="activity-time">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <div className="chart-card-header">
          <h3 className="chart-title">Top Événements</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topEvents} layout="vertical" margin={{ top: 8, right: 30, left: 20, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <YAxis type="category" dataKey="title" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenus (€)" fill="#bf00ff" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
