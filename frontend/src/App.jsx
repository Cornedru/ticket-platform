import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'

const API_URL = ''

const AuthContext = createContext(null)

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
    try {
      const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Request failed')
      return data
    } catch (err) {
      console.error('API Error:', err)
      throw err
    }
  },
  get: (endpoint) => api.request(endpoint),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' })
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/api/auth/profile')
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }

  const register = async (name, email, password) => {
    const data = await api.post('/api/auth/register', { name, email, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  return useContext(AuthContext)
}

function VideoBackground({ src }) {
  if (!src) return null
  return (
    <div className="event-video-bg">
      <video autoPlay loop muted playsInline>
        <source src={src} type="video/mp4" />
      </video>
      <div className="event-video-overlay" />
    </div>
  )
}

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo glitch-hover">✦ TRIP ✦</Link>
        <div className="nav-links">
          <Link to="/">Événements</Link>
          {user ? (
            <>
              <Link to="/orders">Commandes</Link>
              <Link to="/tickets">Billetterie</Link>
              {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
              <span className="text-muted">{user.name}</span>
              <button className="btn btn-outline" onClick={() => { logout(); navigate('/') }}>Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/login">Connexion</Link>
              <Link to="/register" className="btn">Inscription</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/events?upcoming=true')
      .then(data => {
        console.log('Events data:', data)
        setEvents(data.events || data || [])
      })
      .catch(err => {
        console.error('Error loading events:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>
  if (error) return <div className="page"><div className="container"><div className="alert alert-error">Erreur: {error}</div></div></div>

  return (
    <div className="page">
      <div className="container">
        <div className="hero">
          <div className="hero-content">
            <h1>VOYAGE SENSORIEL</h1>
            <p className="hero-subtitle">Plonge dans des expériences hallucinantes - Prix hallucinants</p>
            <Link to="/#events" className="btn btn-primary">
              <span>Explorer les维度</span>
            </Link>
          </div>
        </div>
        
        <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '48px' }}>À Venir</h2>
        
        {events.length === 0 ? (
          <p className="text-center text-muted">Aucun événement disponible - Reviens plus tard</p>
        ) : (
          <div className="grid grid-3">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({ event }) {
  const navigate = useNavigate()
  const videoSample = 'https://assets.mixkit.co/videos/preview/mixkit-abstract-video-of-a-futuristic-interface-32664-large.mp4'

  return (
    <div className="card glitch-hover" onClick={() => navigate(`/event/${event.id}`)} style={{ cursor: 'pointer' }}>
      <div className="card-image">
        {event.videoUrl ? (
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="card-video"
            style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
          >
            <source src={event.videoUrl} type="video/mp4" />
          </video>
        ) : null}
        <div className="card-image-overlay" />
        <span className="icon">✦</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{event.title}</h3>
        <p className="card-text">{event.description}</p>
        <p className="card-text text-muted">
          {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="card-meta">
          <span className="price">{event.price.toFixed(2)} €</span>
          <span className="seats">{event.availableSeats} places</span>
        </div>
        <button className="btn mt-2" style={{ width: '100%' }} onClick={() => navigate(`/event/${event.id}`)}>
          <span>Réserver ton trip</span>
        </button>
      </div>
    </div>
  )
}

function EventDetail() {
  const [event, setEvent] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [processing, setProcessing] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const eventId = window.location.pathname.split('/').pop()

  useEffect(() => {
    api.get(`/api/events/${eventId}`)
      .then(setEvent)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [eventId])

  const handleOrder = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setProcessing(true)
    try {
      const orderData = await api.post('/api/orders', { eventId, quantity })
      const paymentData = await api.post(`/api/orders/${orderData.id}/pay`, { paymentMethod: 'mock' })
      setOrder(paymentData)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>
  if (error) return <div className="page"><div className="container"><div className="alert alert-error">{error}</div></div></div>
  if (!event) return <div className="page"><div className="container"><div className="alert alert-error">Événement non trouvé</div></div></div>

  const videoBg = event.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-abstract-video-of-a-futuristic-interface-32664-large.mp4'

  if (order) {
    return (
      <div className="page">
        <VideoBackground src={videoBg} />
        <div className="container">
          <div className="alert alert-success mb-3">
            Commande confirmée ! Tes billets ont été générés.
          </div>
          <div className="card">
            <div className="card-body">
              <h2 className="mb-2">Tes Billets</h2>
              {order.tickets.map((ticket, i) => (
                <div key={ticket.id} className="mb-2" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                  <p><strong>Billet #{i + 1}</strong></p>
                  <img src={ticket.qrCode} alt="QR Code" className="qr-code" />
                </div>
              ))}
              <Link to="/tickets" className="btn mt-2">Voir tous mes billets</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <VideoBackground src={videoBg} />
      <div className="container">
        <div className="card" style={{ backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.05)' }}>
          <div className="card-body">
            <h1 className="page-title">{event.title}</h1>
            <p className="card-text mb-2">{event.description}</p>
            <p className="text-muted mb-1">
              {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-muted mb-1">{event.location}</p>
            <p className="text-muted mb-3">{event.availableSeats} places disponibles sur {event.totalSeats}</p>
            
            <div className="flex-between mt-3">
              <span className="price">Prix: {event.price.toFixed(2)} €</span>
            </div>
            
            {event.availableSeats > 0 && (
              <div className="mt-3">
                <div className="form-group">
                  <label className="form-label">Nombre de billets</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={event.availableSeats}
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="form-input"
                    style={{ maxWidth: '100px' }}
                  />
                </div>
                <p className="mb-2">Total: <strong>{(event.price * quantity).toFixed(2)} €</strong></p>
                <button 
                  className="btn btn-primary" 
                  onClick={handleOrder}
                  disabled={processing}
                >
                  <span>{processing ? 'Traitement...' : 'Acheter maintenant'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Connexion</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <span>Se connecter</span>
          </button>
        </form>
        <p className="text-center mt-2 text-muted">
          Pas de compte ? <Link to="/register" className="text-accent">S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Inscription</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" minLength={6} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <span>S'inscrire</span>
          </button>
        </form>
        <p className="text-center mt-2 text-muted">
          Déjà un compte ? <Link to="/login" className="text-accent">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/orders')
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes Commandes</h1>
        {orders.length === 0 ? (
          <p className="text-center text-muted">Aucune commande</p>
        ) : (
          <div className="grid gap-2">
            {orders.map(order => (
              <div key={order.id} className="card">
                <div className="card-body">
                  <div className="flex-between">
                    <div>
                      <h3>{order.event.title}</h3>
                      <p className="card-text text-muted">{new Date(order.event.date).toLocaleDateString('fr-FR')}</p>
                      <p className="card-text text-muted">{order.event.location}</p>
                      <p>Quantité: {order.quantity}</p>
                      <p>Total: <strong>{order.totalPrice.toFixed(2)} €</strong></p>
                    </div>
                    <span className={`badge badge-${order.status === 'PAID' ? 'success' : order.status === 'PENDING' ? 'warning' : 'danger'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Tickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/tickets')
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes Billets</h1>
        {tickets.length === 0 ? (
          <p className="text-center text-muted">Aucun billet</p>
        ) : (
          <div className="grid grid-2">
            {tickets.map(ticket => (
              <div key={ticket.id} className="card">
                <div className="card-body text-center">
                  <h3>{ticket.event.title}</h3>
                  <p className="card-text text-muted">{new Date(ticket.event.date).toLocaleDateString('fr-FR')}</p>
                  <p className="card-text text-muted">{ticket.event.location}</p>
                  <img src={ticket.qrCode} alt="QR Code" className="qr-code mt-2" />
                  <p className={`badge mt-2 ${ticket.scanned ? 'badge-danger' : 'badge-success'}`}>
                    {ticket.scanned ? 'Utilisé' : 'Valide'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Admin() {
  const [events, setEvents] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('events')
  const [showEventForm, setShowEventForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', videoUrl: '' })
  const { user } = useAuth()

  useEffect(() => {
    if (activeTab === 'events') {
      api.get('/api/events').then(data => setEvents(data.events)).catch(console.error)
    } else {
      api.get('/api/orders/all').then(setOrders).catch(console.error)
    }
  }, [activeTab])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/events', formData)
      setShowEventForm(false)
      setFormData({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', videoUrl: '' })
      const data = await api.get('/api/events')
      setEvents(data.events)
    } catch (err) {
      alert(err.message)
    }
  }

  if (user?.role !== 'ADMIN') {
    return <div className="page"><div className="container"><p>Accès refusé</p></div></div>
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Administration</h1>
        
        <div className="flex gap-2 mb-3">
          <button className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('events')}>Événements</button>
          <button className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('orders')}>Commandes</button>
        </div>

        {activeTab === 'events' && (
          <>
            <button className="btn mb-3" onClick={() => setShowEventForm(!showEventForm)}>
              <span>{showEventForm ? 'Annuler' : '+ Nouvel événement'}</span>
            </button>
            
            {showEventForm && (
              <div className="card mb-3">
                <div className="card-body">
                  <form onSubmit={handleCreateEvent}>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Titre</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Lieu</label>
                        <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="form-input" required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">URL Vidéo (background)</label>
                      <input type="url" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="form-input" placeholder="https://..." />
                    </div>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prix (€)</label>
                        <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="form-input" required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Places totales</label>
                      <input type="number" value={formData.totalSeats} onChange={e => setFormData({...formData, totalSeats: e.target.value})} className="form-input" required />
                    </div>
                    <button type="submit" className="btn btn-primary"><span>Créer l'événement</span></button>
                  </form>
                </div>
              </div>
            )}

            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Date</th>
                    <th>Places</th>
                    <th>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id}>
                      <td>{event.title}</td>
                      <td>{new Date(event.date).toLocaleDateString('fr-FR')}</td>
                      <td>{event.availableSeats}/{event.totalSeats}</td>
                      <td>{event.price.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Événement</th>
                  <th>Quantité</th>
                  <th>Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.user?.name}<br/><small className="text-muted">{order.user?.email}</small></td>
                    <td>{order.event?.title}</td>
                    <td>{order.quantity}</td>
                    <td>{order.totalPrice.toFixed(2)} €</td>
                    <td><span className={`badge badge-${order.status === 'PAID' ? 'success' : 'warning'}`}>{order.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="loading"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/login" />
  
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
