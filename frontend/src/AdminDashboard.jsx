import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
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
  post: (ep, body) => api.request(ep, { method: 'POST', body: JSON.stringify(body) }),
  put: (ep, body) => api.request(ep, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (ep) => api.request(ep, { method: 'DELETE' }),
}

const COLORS = ['#FF00FF', '#39FF14', '#00FFFF', '#BF00FF', '#FF6B00', '#FF3B30']

const CAT_LABELS = { concert:'Concert', festival:'Festival', humour:'Humour', sport:'Sport', theatre:'Théâtre', conference:'Conférence', other:'Autre' }

function TrendBadge({ value }) {
  if (value === null || value === undefined) return null
  const up = value >= 0
  return (
    <span className={`trend-badge ${up ? 'trend-up' : 'trend-down'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

function KpiCard({ label, value, trend, sub, accent, icon }) {
  return (
    <div className={`new-kpi-card ${accent ? 'kpi-accent' : ''}`}>
      <div className="new-kpi-header">
        <span className="new-kpi-label">{label}</span>
        {icon && <span className="new-kpi-icon">{icon}</span>}
      </div>
      <div className="new-kpi-value">{value}</div>
      {trend !== undefined && <TrendBadge value={trend} />}
      {sub && <div className="new-kpi-sub">{sub}</div>}
    </div>
  )
}

function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const navigate = useNavigate()
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: '◈' },
    { id: 'events', label: 'Événements', icon: '◉' },
    { id: 'orders', label: 'Commandes', icon: '◎' },
    { id: 'users', label: 'Utilisateurs', icon: '◇' },
    { id: 'tickets', label: 'Billets', icon: '◆' },
    { id: 'badges', label: 'Badges', icon: '🏆' },
    { id: 'analytics', label: 'Analytics', icon: '◐' },
  ]

  return (
    <aside className="new-admin-sidebar">
      <div className="new-sidebar-header">
        <Link to="/" className="new-admin-logo">
          <span className="logo-icon">✦</span>
          <span>TRIP</span>
        </Link>
      </div>
      
      <div className="new-sidebar-user">
        <div className="new-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
        <div className="new-user-info">
          <span className="new-user-name">{user?.name || 'Admin'}</span>
          <span className="new-user-role">{user?.role === 'ADMIN' ? 'Administrateur' : 'Staff'}</span>
        </div>
      </div>

      <nav className="new-sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`new-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="new-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="new-sidebar-footer">
        <button className="new-nav-item" onClick={() => { onLogout(); navigate('/') }}>
          <span className="new-nav-icon">⬏</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}

function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/admin/analytics/overview?days=30'),
      api.get('/api/v1/orders/all?limit=5')
    ]).then(([analytics, orders]) => {
      setStats(analytics)
      setRecentOrders(orders.orders || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="new-loading"><div className="spinner" /></div>

  const kpis = stats?.kpis || {}

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <h2 className="new-tab-title">Dashboard</h2>
        <span className="new-tab-subtitle">Vue d'ensemble de la plateforme</span>
      </div>

      <div className="new-kpi-grid">
        <KpiCard label="Revenus (30j)" value={`${(kpis.revenue?.current || 0).toLocaleString('fr-FR')}€`} trend={kpis.revenue?.trend} icon="💰" />
        <KpiCard label="Commandes" value={kpis.orders?.current || 0} trend={kpis.orders?.trend} icon="🛒" />
        <KpiCard label="Billets vendus" value={kpis.tickets?.current || 0} trend={kpis.tickets?.trend} icon="🎫" />
        <KpiCard label="Utilisateurs" value={kpis.activeUsers?.current || 0} icon="👥" accent />
      </div>

      <div className="new-dashboard-grid">
        <div className="new-card new-card-wide">
          <div className="new-card-header">
            <h3>Dernières commandes</h3>
            <button className="btn btn-sm btn-outline" onClick={() => {}}>Voir tout</button>
          </div>
          <div className="new-orders-list">
            {recentOrders.map(order => (
              <div key={order.id} className="new-order-item">
                <div className="new-order-info">
                  <span className="new-order-event">{order.event?.title || 'Événement'}</span>
                  <span className="new-order-user">{order.user?.name}</span>
                </div>
                <div className="new-order-meta">
                  <span className={`new-order-status ${order.status?.toLowerCase()}`}>{order.status}</span>
                  <span className="new-order-price">{order.totalPrice?.toFixed(2)}€</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="new-card">
          <div className="new-card-header">
            <h3>Répartition</h3>
          </div>
          <div className="new-pie-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Payé', value: kpis.orders?.current || 0 },
                    { name: 'En attente', value: Math.floor((kpis.orders?.current || 0) * 0.1) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  <Cell fill="#39FF14" />
                  <Cell fill="#FF6B00" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventsTab() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [formData, setFormData] = useState({
    title: '', description: '', date: '', location: '', price: '', totalSeats: '', category: 'CONCERT', imageUrl: '', videoUrl: ''
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/events?limit=100')
      setEvents(data.events || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        totalSeats: parseInt(formData.totalSeats)
      }
      if (editingEvent) {
        await api.put(`/api/v1/events/${editingEvent.id}`, payload)
      } else {
        await api.post('/api/v1/events', payload)
      }
      setShowModal(false)
      setEditingEvent(null)
      setFormData({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', category: 'CONCERT', imageUrl: '', videoUrl: '' })
      loadEvents()
    } catch (err) { alert(err.message) }
  }

  const handleEdit = (event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date?.slice(0, 16),
      location: event.location,
      price: String(event.price),
      totalSeats: String(event.totalSeats),
      category: event.category,
      imageUrl: event.imageUrl || '',
      videoUrl: event.videoUrl || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet événement ?')) return
    try {
      await api.delete(`/api/v1/events/${id}`)
      loadEvents()
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <div>
          <h2 className="new-tab-title">Événements</h2>
          <span className="new-tab-subtitle">{events.length} événements</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setFormData({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', category: 'CONCERT', imageUrl: '', videoUrl: '' }); setShowModal(true) }}>
          + Ajouter
        </button>
      </div>

      {loading ? (
        <div className="new-loading"><div className="spinner" /></div>
      ) : (
        <div className="new-events-grid">
          {events.map(event => (
            <div key={event.id} className="new-event-card">
              <div className="new-event-image" style={{ backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined }}>
                {!event.imageUrl && <span className="new-event-placeholder">🎪</span>}
                <span className="new-event-category">{CAT_LABELS[event.category?.toLowerCase()] || event.category}</span>
              </div>
              <div className="new-event-content">
                <h3 className="new-event-title">{event.title}</h3>
                <p className="new-event-date">📅 {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="new-event-location">📍 {event.location}</p>
                <div className="new-event-footer">
                  <div className="new-event-seats">
                    <span className={event.availableSeats === 0 ? 'text-danger' : ''}>{event.availableSeats}</span>/{event.totalSeats} places
                  </div>
                  <span className="new-event-price">{event.price?.toFixed(2)}€</span>
                </div>
                <div className="new-event-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => handleEdit(event)}>Éditer</button>
                  <button className="btn btn-sm btn-danger-outline" onClick={() => handleDelete(event.id)}>Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <h3>{editingEvent ? 'Modifier' : 'Ajouter'} un événement</h3>
            <form onSubmit={handleSubmit} className="new-admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Titre</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required />
                </div>
                <div className="form-group">
                  <label>Catégorie</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input">
                    <option value="CONCERT">Concert</option>
                    <option value="FESTIVAL">Festival</option>
                    <option value="SPORT">Sport</option>
                    <option value="THEATRE">Théâtre</option>
                    <option value="HUMOUR">Humour</option>
                    <option value="CONFERENCE">Conférence</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="form-input" rows={3} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" required />
                </div>
                <div className="form-group">
                  <label>Lieu</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="form-input" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prix (€)</label>
                  <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="form-input" required />
                </div>
                <div className="form-group">
                  <label>Places totales</label>
                  <input type="number" value={formData.totalSeats} onChange={e => setFormData({...formData, totalSeats: e.target.value})} className="form-input" required />
                </div>
              </div>
              <div className="form-group">
                <label>URL Image</label>
                <input type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="form-input" />
              </div>
              <div className="form-group">
                <label>URL Vidéo (YouTube)</label>
                <input type="url" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="form-input" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingEvent ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/orders/all?limit=100')
      setOrders(data.orders || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const filteredOrders = orders.filter(o => 
    o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.event?.title?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status) => {
    const colors = { PAID: 'success', PENDING: 'warning', CANCELLED: 'danger' }
    return <span className={`badge badge-${colors[status] || 'default'}`}>{status}</span>
  }

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <div>
          <h2 className="new-tab-title">Commandes</h2>
          <span className="new-tab-subtitle">{filteredOrders.length} commandes</span>
        </div>
      </div>

      <div className="new-search-bar">
        <input 
          type="text" 
          placeholder="Rechercher..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
        />
      </div>

      {loading ? (
        <div className="new-loading"><div className="spinner" /></div>
      ) : (
        <div className="new-table-container">
          <table className="new-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Événement</th>
                <th>Qté</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="new-td-mono">{order.id.slice(0, 8)}...</td>
                  <td>
                    <div className="new-td-user">
                      <span>{order.user?.name}</span>
                      <small>{order.user?.email}</small>
                    </div>
                  </td>
                  <td>{order.event?.title}</td>
                  <td>{order.quantity}</td>
                  <td className="new-td-price">{order.totalPrice?.toFixed(2)}€</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td className="new-td-date">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'USER' })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/admin/users?limit=100')
      setUsers(data.users || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.put(`/api/v1/admin/users/${editingUser.id}`, formData)
      } else {
        await api.post('/api/v1/admin/users', formData)
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({ name: '', email: '', role: 'USER' })
      loadUsers()
    } catch (err) { alert(err.message) }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, role: user.role })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      await api.delete(`/api/v1/admin/users/${id}`)
      loadUsers()
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <div>
          <h2 className="new-tab-title">Utilisateurs</h2>
          <span className="new-tab-subtitle">{filteredUsers.length} utilisateurs</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', role: 'USER' }); setShowModal(true) }}>
          + Ajouter
        </button>
      </div>

      <div className="new-search-bar">
        <input 
          type="text" 
          placeholder="Rechercher..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
        />
      </div>

      {loading ? (
        <div className="new-loading"><div className="spinner" /></div>
      ) : (
        <div className="new-table-container">
          <table className="new-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Inscrit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="new-td-user">
                      <span className="new-user-avatar-sm">{user.name?.charAt(0)?.toUpperCase()}</span>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td><span className={`badge badge-${user.role === 'ADMIN' ? 'admin' : 'user'}`}>{user.role}</span></td>
                  <td className="new-td-date">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                  <td>
                    <div className="new-td-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(user)}>Éditer</button>
                      <button className="btn btn-sm btn-danger-outline" onClick={() => handleDelete(user.id)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingUser ? 'Modifier' : 'Ajouter'} un utilisateur</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="form-input" required disabled={!!editingUser} />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label>Mot de passe</label>
                  <input type="password" className="form-input" required />
                </div>
              )}
              <div className="form-group">
                <label>Rôle</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="form-input">
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TicketsTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/tickets?limit=100')
      setTickets(data.tickets || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleScan = async (e) => {
    e.preventDefault()
    if (!scanInput.trim()) return
    
    setScanning(true)
    setScanResult(null)
    
    try {
      const result = await api.post('/api/v1/tickets/validate', { qrData: scanInput })
      setScanResult({ success: true, data: result })
      loadTickets()
    } catch (err) {
      setScanResult({ success: false, error: err.message })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <div>
          <h2 className="new-tab-title">Billets</h2>
          <span className="new-tab-subtitle">{tickets.length} billets</span>
        </div>
      </div>

      <div className="new-card">
        <h3>Scanner de billets</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>Entrez les données QR code pour valider un billet</p>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder='{"ticketId":"...","eventId":"..."}'
            className="form-input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={scanning}>
            {scanning ? 'Validation...' : 'Valider'}
          </button>
        </form>
        {scanResult && (
          <div className={`new-scan-result ${scanResult.success ? 'success' : 'error'}`}>
            {scanResult.success ? (
              <>
                <span className="result-icon">✓</span>
                <div>
                  <strong>Billet valide</strong>
                  <p>{scanResult.data.ticket?.user?.name} - {scanResult.data.ticket?.event?.title}</p>
                </div>
              </>
            ) : (
              <>
                <span className="result-icon">✕</span>
                <div>
                  <strong>Invalid</strong>
                  <p>{scanResult.error}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="new-loading"><div className="spinner" /></div>
      ) : (
        <div className="new-table-container">
          <table className="new-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Événement</th>
                <th>Propriétaire</th>
                <th>Scanné</th>
                <th>Transféré</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td className="new-td-mono">{ticket.id.slice(0, 8)}...</td>
                  <td>{ticket.event?.title}</td>
                  <td>{ticket.user?.email || ticket.userId?.slice(0, 8)}...</td>
                  <td>{ticket.scanned ? <span className="badge badge-success">✓</span> : '—'}</td>
                  <td>{ticket.transferredAt ? <span className="badge badge-success">✓</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AnalyticsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [chartType, setChartType] = useState('revenue')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/api/v1/admin/analytics/overview?days=${period}`),
      api.get(`/api/v1/admin/analytics/logs?days=${period}`)
    ]).then(([overview, logs]) => {
      setData({ ...overview, logs: logs.logs || [] })
    }).catch(console.error).finally(() => setLoading(false))
  }, [period])

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

  if (loading) return <div className="new-loading"><div className="spinner" /></div>
  if (!data) return <div className="alert alert-error">Impossible de charger les analytics</div>

  const { kpis, timeSeries, topEvents, logs } = data
  const fmt = (n) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) || '0'
  const fmtEur = (n) => `${n?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}€`

  const getLogIcon = (type) => {
    const icons = { ORDER: '🎫', USER: '👤', EVENT: '📅', TICKET: '🎟️', PAYMENT: '💳', WAITLIST: '⏳' }
    return icons[type] || '📌'
  }

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <h2 className="new-tab-title">Analytics</h2>
        <div className="new-period-selector">
          {[['7','7j'],['30','30j'],['90','90j']].map(([v, l]) => (
            <button key={v} className={`period-tab ${period === v ? 'active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="new-kpi-grid">
        <KpiCard label="Revenus" value={fmtEur(kpis.revenue.current)} trend={kpis.revenue.trend} sub={`Total: ${fmtEur(kpis.revenue.total)}`} accent icon="💰" />
        <KpiCard label="Commandes" value={fmt(kpis.orders.current)} trend={kpis.orders.trend} sub={`Total: ${fmt(kpis.orders.total)}`} icon="🛒" />
        <KpiCard label="Billets vendus" value={fmt(kpis.tickets.current)} trend={kpis.tickets.trend} sub={`Total: ${fmt(kpis.tickets.total)}`} icon="🎫" />
        <KpiCard label="Panier moyen" value={fmtEur(kpis.avgOrderValue.current)} trend={kpis.avgOrderValue.trend} icon="📊" />
      </div>

      <div className="new-dashboard-grid">
        <div className="new-card new-card-wide">
          <div className="new-card-header">
            <h3>Évolution</h3>
            <div className="new-chart-tabs">
              <button className={`chart-tab ${chartType === 'revenue' ? 'active' : ''}`} onClick={() => setChartType('revenue')}>Revenus</button>
              <button className={`chart-tab ${chartType === 'orders' ? 'active' : ''}`} onClick={() => setChartType('orders')}>Commandes</button>
              <button className={`chart-tab ${chartType === 'tickets' ? 'active' : ''}`} onClick={() => setChartType('tickets')}>Billets</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenueNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF00FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOrdersNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#39FF14" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#39FF14" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTicketsNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FFFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => chartType === 'revenue' ? `${v}€` : v} width={50} />
              <Tooltip content={<CustomTooltip />} />
              {chartType === 'revenue'
                ? <Area type="monotone" dataKey="revenue" name="Revenus (€)" stroke="#FF00FF" strokeWidth={2} fill="url(#gradRevenueNew)" />
                : chartType === 'orders'
                  ? <Area type="monotone" dataKey="orders" name="Commandes" stroke="#39FF14" strokeWidth={2} fill="url(#gradOrdersNew)" />
                  : <Area type="monotone" dataKey="tickets" name="Billets" stroke="#00FFFF" strokeWidth={2} fill="url(#gradTicketsNew)" />
              }
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="new-card">
          <div className="new-card-header">
            <h3>Activité récente</h3>
          </div>
          <div className="new-activity-list">
            {logs?.slice(0, 8).map((log, i) => (
              <div key={i} className="new-activity-item">
                <span className="new-activity-icon">{getLogIcon(log.type)}</span>
                <div className="new-activity-content">
                  <p className="new-activity-message">{log.message}</p>
                  <span className="new-activity-time">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topEvents?.length > 0 && (
        <div className="new-card">
          <div className="new-card-header">
            <h3>Top Événements</h3>
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
      )}
    </div>
  )
}

function BadgesTab() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBadge, setEditingBadge] = useState(null)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [badgeUsers, setBadgeUsers] = useState([])
  const [formData, setFormData] = useState({ name: '', description: '', icon: '🏆', category: 'ACHIEVEMENT', points: 0 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const loadBadges = () => {
    api.get('/api/v1/admin/badges')
      .then(data => setBadges(data.badges || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBadges()
  }, [])

  const handleSaveBadge = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      if (editingBadge) {
        await api.put(`/api/v1/admin/badges/${editingBadge.id}`, formData)
        setMessage({ type: 'success', text: 'Badge mis à jour !' })
      } else {
        await api.post('/api/v1/admin/badges', formData)
        setMessage({ type: 'success', text: 'Badge créé !' })
      }
      loadBadges()
      setShowModal(false)
      setEditingBadge(null)
      setFormData({ name: '', description: '', icon: '🏆', category: 'ACHIEVEMENT', points: 0 })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEditBadge = (badge) => {
    setEditingBadge(badge)
    setFormData({ name: badge.name, description: badge.description, icon: badge.icon, category: badge.category, points: badge.points })
    setShowModal(true)
  }

  const handleDeleteBadge = async (id) => {
    if (!confirm('Supprimer ce badge ?')) return
    try {
      await api.delete(`/api/v1/admin/badges/${id}`)
      loadBadges()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleViewUsers = async (badge) => {
    setSelectedBadge(badge)
    try {
      const data = await api.get(`/api/v1/admin/badges/${badge.id}/users`)
      setBadgeUsers(data.userBadges || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleAwardBadge = async (userId) => {
    try {
      await api.post(`/api/v1/admin/badges/${selectedBadge.id}/award`, { userId })
      const data = await api.get(`/api/v1/admin/badges/${selectedBadge.id}/users`)
      setBadgeUsers(data.userBadges || [])
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRevokeBadge = async (userId) => {
    try {
      await api.delete(`/api/v1/admin/badges/${selectedBadge.id}/revoke/${userId}`)
      const data = await api.get(`/api/v1/admin/badges/${selectedBadge.id}/users`)
      setBadgeUsers(data.userBadges || [])
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="new-loading"><div className="spinner" /></div>

  return (
    <div className="new-tab-content">
      <div className="new-tab-header">
        <h2 className="new-tab-title">Badges</h2>
        <button className="btn btn-primary" onClick={() => { setEditingBadge(null); setFormData({ name: '', description: '', icon: '🏆', category: 'ACHIEVEMENT', points: 0 }); setShowModal(true) }}>
          + Nouveau badge
        </button>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="new-card">
        <table className="new-table">
          <thead>
            <tr>
              <th>Icône</th>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {badges.map(badge => (
              <tr key={badge.id}>
                <td><span style={{ fontSize: '1.5rem' }}>{badge.icon}</span></td>
                <td>{badge.name}</td>
                <td><span className={`badge badge-${badge.category?.toLowerCase()}`}>{badge.category}</span></td>
                <td>{badge.points}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => handleViewUsers(badge)}>👥</button>
                  <button className="btn btn-sm btn-outline" onClick={() => handleEditBadge(badge)}>✏️</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteBadge(badge.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {badges.length === 0 && <div className="new-empty">Aucun badge</div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBadge ? 'Modifier le badge' : 'Nouveau badge'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveBadge}>
              <div className="form-group">
                <label>Nom</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Icône (emoji)</label>
                <input type="text" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="ACHIEVEMENT">Achievement</option>
                  <option value="EVENT">Événement</option>
                  <option value="SOCIAL">Social</option>
                  <option value="VIP">VIP</option>
                  <option value="SPECIAL">Spécial</option>
                </select>
              </div>
              <div className="form-group">
                <label>Points</label>
                <input type="number" value={formData.points} onChange={e => setFormData({...formData, points: parseInt(e.target.value) || 0})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBadge && (
        <div className="modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedBadge.icon} {selectedBadge.name}</h3>
              <button className="modal-close" onClick={() => setSelectedBadge(null)}>×</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <p><strong>Description:</strong> {selectedBadge.description}</p>
              <AwardBadgeForm badgeId={selectedBadge.id} onAward={() => handleViewUsers(selectedBadge)} />
            </div>
            <div className="new-card" style={{ margin: '1rem' }}>
              <h4>Utilisateurs ({badgeUsers.length})</h4>
              {badgeUsers.length > 0 ? (
                <div className="user-badge-list">
                  {badgeUsers.map(ub => (
                    <div key={ub.id} className="user-badge-item">
                      <span>{ub.user?.name}</span>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRevokeBadge(ub.userId)}>Retirer</button>
                    </div>
                  ))}
                </div>
              ) : <div className="new-empty">Aucun utilisateur</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AwardBadgeForm({ badgeId, onAward }) {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAward = async (e) => {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    try {
      await api.post(`/api/v1/admin/badges/${badgeId}/award`, { userId })
      setUserId('')
      onAward()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleAward} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
      <input 
        type="text" 
        placeholder="ID utilisateur" 
        value={userId} 
        onChange={e => setUserId(e.target.value)}
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary" disabled={loading || !userId}>
        {loading ? '...' : 'Attribuer'}
      </button>
    </form>
  )
}

export function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />
      case 'events': return <EventsTab />
      case 'orders': return <OrdersTab />
      case 'users': return <UsersTab />
      case 'tickets': return <TicketsTab />
      case 'badges': return <BadgesTab />
      case 'analytics': return <AnalyticsTab />
      default: return <OverviewTab />
    }
  }

  return (
    <div className="new-admin-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={onLogout} />
      <main className="new-admin-main">
        {renderTab()}
      </main>
    </div>
  )
}

export default AdminDashboard
