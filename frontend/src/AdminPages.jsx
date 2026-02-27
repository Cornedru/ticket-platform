import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

function AdminLayout({ children, activeTab, setActiveTab }) {
  const navigate = useNavigate()
  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: '📊' },
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
    { id: 'orders', label: 'Commandes', icon: '🛒' },
    { id: 'events', label: 'Événements', icon: '🎪' },
    { id: 'tickets', label: 'Billets', icon: '🎫' },
  ]

  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <h2 className="admin-title">Admin</h2>
        <nav className="admin-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <Link to="/" className="admin-back">← Retour au site</Link>
      </div>
      <div className="admin-content">
        {children}
      </div>
    </div>
  )
}

export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [saving, setSaving] = useState(false)

  const loadUsers = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const data = await api.get(`/api/v1/admin/users?${params}`)
      setUsers(data.users || [])
      setPagination(data.pagination || { page: 1, totalPages: 1 })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    loadUsers(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingUser) {
        await api.put(`/api/v1/admin/users/${editingUser.id}`, formData)
      } else {
        await api.post('/api/v1/admin/users', formData)
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '', role: 'USER' })
      loadUsers(pagination.page)
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, password: '', role: user.role })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      await api.delete(`/api/v1/admin/users/${id}`)
      loadUsers(pagination.page)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Utilisateurs</h1>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'USER' }); setShowModal(true) }}>
          + Ajouter
        </button>
      </div>

      <form onSubmit={handleSearch} className="admin-search">
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="filter-input" />
        <button type="submit" className="btn btn-outline">Rechercher</button>
      </form>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td><span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => handleEdit(user)}>Éditer</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-pagination">
            <button disabled={pagination.page === 1} onClick={() => loadUsers(pagination.page - 1)}>← Précédent</button>
            <span>{pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadUsers(pagination.page + 1)}>Suivant →</button>
          </div>
        </>
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
              <div className="form-group">
                <label>Mot de passe {editingUser && '(laisser vide pour conserver)'}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="form-input" required={!editingUser} />
              </div>
              <div className="form-group">
                <label>Rôle</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="form-input">
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })

  const loadOrders = async (page = 1) => {
    setLoading(true)
    try {
      const data = await api.get(`/api/v1/orders/all?page=${page}&limit=20`)
      setOrders(data.orders || [])
      setPagination(data.pagination || { page: 1, totalPages: 1 })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  const getStatusBadge = (status) => {
    const colors = { PAID: 'success', PENDING: 'warning', CANCELLED: 'danger' }
    return <span className={`badge badge-${colors[status] || 'default'}`}>{status}</span>
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Commandes</h1>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Événement</th>
                <th>Quantité</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}...</td>
                  <td>{order.user?.name}<br/><small>{order.user?.email}</small></td>
                  <td>{order.event?.title}</td>
                  <td>{order.quantity}</td>
                  <td>{order.totalPrice?.toFixed(2)}€</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-pagination">
            <button disabled={pagination.page === 1} onClick={() => loadOrders(pagination.page - 1)}>← Précédent</button>
            <span>{pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadOrders(pagination.page + 1)}>Suivant →</button>
          </div>
        </>
      )}
    </div>
  )
}

export function AdminEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [formData, setFormData] = useState({
    title: '', description: '', date: '', location: '', price: '', totalSeats: '', category: 'CONCERT', imageUrl: '', videoUrl: ''
  })

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/events?limit=100')
      setEvents(data.events || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [])

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
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEdit = (event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date.slice(0, 16),
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
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Événements</h1>
        <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setFormData({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', category: 'CONCERT', imageUrl: '', videoUrl: '' }); setShowModal(true) }}>
          + Ajouter
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="admin-events-grid">
          {events.map(event => (
            <div key={event.id} className="admin-event-card">
              <h3>{event.title}</h3>
              <p>{new Date(event.date).toLocaleDateString('fr-FR')}</p>
              <p>{event.location}</p>
              <div className="admin-event-stats">
                <span>{event.availableSeats} / {event.totalSeats} places</span>
                <span>{event.price}€</span>
              </div>
              <div className="admin-event-actions">
                <button className="btn btn-sm btn-outline" onClick={() => handleEdit(event)}>Éditer</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(event.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <h3>{editingEvent ? 'Modifier' : 'Ajouter'} un événement</h3>
            <form onSubmit={handleSubmit} className="admin-form">
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
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanning, setScanning] = useState(false)

  const loadTickets = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/tickets?limit=100')
      setTickets(data.tickets || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [])

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
    <div>
      <div className="admin-header">
        <h1>Billets</h1>
      </div>

      <div className="admin-scanner-section">
        <h3>Scanner de billets</h3>
        <p className="admin-scanner-desc">Entrez les données QR code pour valider un billet</p>
        <form onSubmit={handleScan} className="admin-scanner-form">
          <input 
            type="text" 
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder='{"ticketId":"...","eventId":"..."}'
            className="form-input"
          />
          <button type="submit" className="btn btn-primary" disabled={scanning}>
            {scanning ? 'Validation...' : 'Valider'}
          </button>
        </form>
        {scanResult && (
          <div className={`admin-scan-result ${scanResult.success ? 'success' : 'error'}`}>
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
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <table className="admin-table">
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
                <td>{ticket.id.slice(0, 8)}...</td>
                <td>{ticket.event?.title}</td>
                <td>{ticket.user?.email || ticket.userId?.slice(0, 8)}...</td>
                <td>{ticket.scanned ? '✓' : '—'}</td>
                <td>{ticket.transferredAt ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminUsers
