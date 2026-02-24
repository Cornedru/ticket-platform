import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useParams } from 'react-router-dom'
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

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">TRIP</span>
        </Link>
        
        <div className="nav-search">
          <input 
            type="text" 
            placeholder="Rechercher un artiste, événement..." 
            className="search-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/?search=${e.target.value}`)
              }
            }}
          />
        </div>
        
        <div className="nav-links">
          <Link to="/events" className="nav-link">Événements</Link>
          <Link to="/recommendations" className="nav-link">Pour vous</Link>
          {user ? (
            <>
              <Link to="/orders" className="nav-link">Mes commandes</Link>
              <Link to="/tickets" className="nav-link">Mes billets</Link>
              {user.role === 'ADMIN' && <Link to="/admin" className="nav-link">Admin</Link>}
              <div className="user-menu">
                <span className="user-avatar">{user.name.charAt(0)}</span>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate('/') }}>Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Connexion</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Inscription</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/?search=${search}`)
  }

  return (
    <section className="hero-section">
      <div className="hero-bg">
        <div className="hero-gradient" />
        <div className="hero-pattern" />
      </div>
      <div className="container hero-content">
        <h1 className="hero-title">
          <span className="hero-title-line">VIBREZ</span>
          <span className="hero-title-line accent">DIFFÉREMMENT</span>
        </h1>
        <p className="hero-subtitle">Des expériences uniques. Des moments inoubliables. Trouvez votre prochaine adventure.</p>
        
        <form onSubmit={handleSearch} className="hero-search">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Artiste, ville, genre..." 
            className="hero-search-input"
          />
          <button type="submit" className="btn btn-primary">Rechercher</button>
        </form>
        
        <div className="hero-categories">
          <Link to="/?category=concert" className="category-pill">Concerts</Link>
          <Link to="/?category=festival" className="category-pill">Festivals</Link>
          <Link to="/?category=humour" className="category-pill">Humour</Link>
          <Link to="/?category=sport" className="category-pill">Sport</Link>
          <Link to="/?category=theatre" className="category-pill">Théâtre</Link>
        </div>
      </div>
    </section>
  )
}

function FeaturedEvents({ events }) {
  const navigate = useNavigate()
  if (!events || events.length === 0) return null

  const featured = events.slice(0, 3)

  return (
    <section className="featured-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">À la une</h2>
          <Link to="/events" className="section-link">Voir tout</Link>
        </div>
        
        <div className="featured-grid">
          {featured.map((event, index) => (
            <div 
              key={event.id} 
              className={`featured-card featured-card-${index + 1}`}
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <div className="featured-card-bg">
                {event.videoUrl && (
                  <video autoPlay loop muted playsInline>
                    <source src={event.videoUrl} type="video/mp4" />
                  </video>
                )}
                <div className="featured-card-overlay" />
              </div>
              <div className="featured-card-content">
                <span className="featured-badge">À la une</span>
                <h3 className="featured-title">{event.title}</h3>
                <p className="featured-meta">
                  {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} • {event.location}
                </p>
                <div className="featured-footer">
                  <span className="featured-price">À partir de {event.price.toFixed(2)}€</span>
                  <span className="btn btn-sm">Voir</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EventGrid({ events, loading, title, emptyMessage }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="container">
        <h2 className="section-title">{title}</h2>
        <div className="events-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="event-card-skeleton">
              <div className="skeleton skeleton-image" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="container">
        <h2 className="section-title">{title}</h2>
        <div className="empty-state">
          <span className="empty-icon">✦</span>
          <p>{emptyMessage || 'Aucun événement trouvé'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h2 className="section-title">{title}</h2>
      <div className="events-grid">
        {events.map(event => (
          <div key={event.id} className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
            <div className="event-card-media">
              {event.videoUrl ? (
                <video autoPlay loop muted playsInline className="event-card-video">
                  <source src={event.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <div className="event-card-image-placeholder">
                  <span>✦</span>
                </div>
              )}
              <div className="event-card-overlay" />
              <span className="event-card-category">Concert</span>
              {event.availableSeats < 50 && event.availableSeats > 0 && (
                <span className="event-card-alert">Plus que {event.availableSeats} places!</span>
              )}
              {event.availableSeats === 0 && (
                <span className="event-card-soldout">Complet</span>
              )}
            </div>
            <div className="event-card-content">
              <h3 className="event-card-title">{event.title}</h3>
              <p className="event-card-date">
                {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="event-card-location">{event.location}</p>
              <div className="event-card-footer">
                <span className="event-card-price">
                  {event.price.toFixed(2)}€
                </span>
                <span className="btn btn-sm">Réserver</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchParam = params.get('search') || ''
    setSearch(searchParam)
    
    api.get(`/api/events${searchParam ? `?search=${searchParam}` : ''}`)
      .then(data => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="home-page">
      <Hero />
      <FeaturedEvents events={events} />
      <EventGrid 
        events={events} 
        loading={loading} 
        title={search ? `Résultats pour "${search}"` : 'Tous les événements'} 
      />
    </div>
  )
}

function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ search: '', date: '', price: '' })

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter.search) params.set('search', filter.search)
    if (filter.date) params.set('date', filter.date)
    
    api.get(`/api/events${params.toString() ? '?' + params.toString() : ''}`)
      .then(data => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="page events-page">
      <div className="container">
        <h1 className="page-title">Tous les événements</h1>
        
        <div className="filters-bar">
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="filter-input"
            value={filter.search}
            onChange={(e) => setFilter({...filter, search: e.target.value})}
          />
          <select 
            className="filter-select"
            value={filter.date}
            onChange={(e) => setFilter({...filter, date: e.target.value})}
          >
            <option value="">Toutes dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
          <select 
            className="filter-select"
            value={filter.price}
            onChange={(e) => setFilter({...filter, price: e.target.value})}
          >
            <option value="">Tous prix</option>
            <option value="asc">Prix croissant</option>
            <option value="desc">Prix décroissant</option>
          </select>
        </div>
        
        <EventGrid events={events} loading={loading} title="" />
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
  const [inWaitlist, setInWaitlist] = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    api.get(`/api/events/${id}`)
      .then(setEvent)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleOrder = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setProcessing(true)
    try {
      const orderData = await api.post('/api/orders', { eventId: id, quantity })
      const paymentData = await api.post(`/api/orders/${orderData.id}/pay`, { paymentMethod: 'mock' })
      setOrder(paymentData)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleWaitlist = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setWaitlistLoading(true)
    try {
      await api.post('/api/waitlist', { eventId: id })
      setInWaitlist(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setWaitlistLoading(false)
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (error) return <div className="page"><div className="container"><div className="alert alert-error">{error}</div></div></div>
  if (!event) return <div className="page"><div className="container"><div className="alert alert-error">Événement non trouvé</div></div></div>

  const videoBg = event.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-abstract-video-of-a-futuristic-interface-32664-large.mp4'

  if (order) {
    return (
      <div className="page">
        <div className="event-detail-hero" style={{ background: `url(${videoBg}) center/cover` }}>
          <div className="event-detail-overlay" />
          <div className="container">
            <div className="success-card">
              <span className="success-icon">✓</span>
              <h2>Commande confirmée!</h2>
              <p>Tes billets ont été générés</p>
              <div className="tickets-grid">
                {order.tickets.map((ticket, i) => (
                  <div key={ticket.id} className="ticket-preview">
                    <img src={ticket.qrCode} alt="QR Code" />
                    <span>Billet #{i + 1}</span>
                  </div>
                ))}
              </div>
              <Link to="/tickets" className="btn btn-primary">Voir mes billets</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const soldOut = event.availableSeats === 0

  return (
    <div className="page event-detail-page">
      <div className="event-detail-hero" style={{ background: `url(${videoBg}) center/cover` }}>
        <div className="event-detail-overlay" />
        <div className="container event-detail-header">
          <div className="event-detail-info">
            <span className="event-detail-category">Concert</span>
            <h1 className="event-detail-title">{event.title}</h1>
            <p className="event-detail-description">{event.description}</p>
            <div className="event-detail-meta">
              <span className="meta-item">
                <span className="meta-icon">📅</span>
                {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="meta-item">
                <span className="meta-icon">📍</span>
                {event.location}
              </span>
              <span className="meta-item">
                <span className="meta-icon">🎫</span>
                {event.availableSeats} places disponibles
              </span>
            </div>
          </div>
          
          <div className="event-detail-card">
            <div className="price-display">
              <span className="price-label">À partir de</span>
              <span className="price-value">{event.price.toFixed(2)}€</span>
            </div>
            
            {soldOut ? (
              <div className="soldout-section">
                <span className="soldout-badge">Complet</span>
                <button 
                  className="btn btn-outline" 
                  onClick={handleWaitlist}
                  disabled={waitlistLoading || inWaitlist}
                >
                  {inWaitlist ? 'Inscrit ✓' : waitlistLoading ? 'Inscription...' : 'Rejoindre la liste d\'attente'}
                </button>
              </div>
            ) : (
              <>
                <div className="quantity-selector">
                  <label>Nombre de billets</label>
                  <div className="quantity-controls">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(event.availableSeats, quantity + 1))}>+</button>
                  </div>
                </div>
                <div className="total-display">
                  <span>Total</span>
                  <span>{(event.price * quantity).toFixed(2)}€</span>
                </div>
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleOrder}
                  disabled={processing}
                >
                  {processing ? 'Traitement...' : 'Réserver'}
                </button>
              </>
            )}
            
            <p className="secure-notice">🔒 Paiement sécurisé</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Recommendations() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/recommendations')
      .then(data => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Recommandations</h1>
          <p className="page-subtitle">Basé sur vos envies et les tendances</p>
        </div>
        <EventGrid events={events} loading={loading} title="" />
      </div>
    </div>
  )
}

function Waitlist() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/waitlist')
      .then(data => setEntries(data.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (id) => {
    try {
      await api.delete(`/api/waitlist/${id}`)
      setEntries(entries.filter(e => e.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Ma liste d'attente</h1>
        {entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
            <p>Vous n'êtes sur aucune liste d'attente</p>
            <Link to="/events" className="btn btn-primary">Découvrir des événements</Link>
          </div>
        ) : (
          <div className="waitlist-grid">
            {entries.map(entry => (
              <div key={entry.id} className="waitlist-card">
                <h3>{entry.event.title}</h3>
                <p>Position: #{entry.position}</p>
                <p>Date: {new Date(entry.event.date).toLocaleDateString('fr-FR')}</p>
                <button className="btn btn-outline btn-sm" onClick={() => handleRemove(entry.id)}>
                  Quitter
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/analytics')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Tableau de bord</h1>
        
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{data?.totalEvents || 0}</span>
            <span className="stat-label">Événements</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{data?.totalOrders || 0}</span>
            <span className="stat-label">Commandes</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{data?.totalRevenue?.toFixed(2) || 0}€</span>
            <span className="stat-label">Revenus</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{data?.totalTickets || 0}</span>
            <span className="stat-label">Billets vendus</span>
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
      <div className="auth-container">
        <div className="auth-visual">
          <h2>Bon retour!</h2>
          <p>Connectez-vous pour accéder à vos billets et commandes</p>
        </div>
        <div className="auth-form-container">
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
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Se connecter
            </button>
          </form>
          <p className="text-center mt-3 text-muted">
            Pas de compte? <Link to="/register" className="text-accent">S'inscrire</Link>
          </p>
        </div>
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
      <div className="auth-container">
        <div className="auth-visual">
          <h2>Rejoignez l'aventure!</h2>
          <p>Créez votre compte pour réserver vos billets</p>
        </div>
        <div className="auth-form-container">
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
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              S'inscrire
            </button>
          </form>
          <p className="text-center mt-3 text-muted">
            Déjà un compte? <Link to="/login" className="text-accent">Se connecter</Link>
          </p>
        </div>
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

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes commandes</h1>
        {orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
            <p>Aucune commande</p>
            <Link to="/events" className="btn btn-primary">Découvrir des événements</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-info">
                  <h3>{order.event.title}</h3>
                  <p>{new Date(order.event.date).toLocaleDateString('fr-FR')} • {order.event.location}</p>
                  <p>{order.quantity} billet(s) • Total: {order.totalPrice.toFixed(2)}€</p>
                </div>
                <div className="order-status">
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {order.status === 'PAID' ? 'Confirmé' : order.status === 'PENDING' ? 'En attente' : 'Annulé'}
                  </span>
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
  const [selectedTicket, setSelectedTicket] = useState(null)

  useEffect(() => {
    api.get('/api/tickets')
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes billets</h1>
        {tickets.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✦</span>
            <p>Aucun billet</p>
            <Link to="/events" className="btn btn-primary">Réserver un événement</Link>
          </div>
        ) : (
          <div className="tickets-grid-view">
            {tickets.map(ticket => (
              <div 
                key={ticket.id} 
                className="ticket-card"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="ticket-card-header">
                  <span className="ticket-event">{ticket.event.title}</span>
                  <span className={`ticket-status ${ticket.scanned ? 'used' : 'valid'}`}>
                    {ticket.scanned ? 'Utilisé' : 'Valide'}
                  </span>
                </div>
                <div className="ticket-card-body">
                  <p className="ticket-date">{new Date(ticket.event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="ticket-location">{ticket.event.location}</p>
                  <img src={ticket.qrCode} alt="QR Code" className="ticket-qr" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content ticket-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTicket(null)}>×</button>
            <h3>{selectedTicket.event.title}</h3>
            <p>{new Date(selectedTicket.event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
            <p>{selectedTicket.event.location}</p>
            <img src={selectedTicket.qrCode} alt="QR Code" className="qr-code-lg" />
          </div>
        </div>
      )}
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
    <div className="page admin-page">
      <div className="container">
        <h1 className="page-title">Administration</h1>
        
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Événements
          </button>
          <button 
            className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Commandes
          </button>
          <button 
            className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'events' && (
          <>
            <button className="btn mb-4" onClick={() => setShowEventForm(!showEventForm)}>
              {showEventForm ? 'Annuler' : '+ Nouvel événement'}
            </button>
            
            {showEventForm && (
              <div className="admin-form-card">
                <form onSubmit={handleCreateEvent}>
                  <div className="form-row">
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
                    <label className="form-label">URL Vidéo</label>
                    <input type="url" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="form-input" placeholder="https://..." />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Prix (€)</label>
                      <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Places</label>
                      <input type="number" value={formData.totalSeats} onChange={e => setFormData({...formData, totalSeats: e.target.value})} className="form-input" required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Créer</button>
                </form>
              </div>
            )}

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Événement</th>
                    <th>Date</th>
                    <th>Places</th>
                    <th>Prix</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id}>
                      <td>{event.title}</td>
                      <td>{new Date(event.date).toLocaleDateString('fr-FR')}</td>
                      <td>{event.availableSeats}/{event.totalSeats}</td>
                      <td>{event.price.toFixed(2)}€</td>
                      <td>
                        <button className="btn btn-sm btn-outline">Modifier</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="admin-table-container">
            <table className="admin-table">
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
                    <td>{order.user?.name}</td>
                    <td>{order.event?.title}</td>
                    <td>{order.quantity}</td>
                    <td>{order.totalPrice.toFixed(2)}€</td>
                    <td>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="loading"><div className="spinner" /></div>
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
          <Route path="/events" element={<Events />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/waitlist" element={<ProtectedRoute><Waitlist /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
