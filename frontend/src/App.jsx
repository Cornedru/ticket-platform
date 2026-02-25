import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend
} from 'recharts'

const API_URL = ''

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#bf00ff',
    colorBackground: '#050508',
    colorText: '#ffffff',
    colorDanger: '#ff4444',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '8px',
  },
  rules: {
    '.Input': { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' },
    '.Input:focus': { borderColor: '#bf00ff', boxShadow: '0 0 20px rgba(191,0,255,0.2)' }
  }
}

const getYouTubeVideoId = (url) => {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}
const getYouTubeEmbedUrl = (url) => {
  const id = getYouTubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&rel=0` : null
}
const getYouTubeThumbnailUrl = (url) => {
  const id = getYouTubeVideoId(url)
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null
}
const isYouTubeUrl = (url) => !!getYouTubeVideoId(url)

const AuthContext = createContext(null)

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

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/api/v1/auth/profile')
        .then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false))
    } else { setLoading(false) }
  }, [])

  const login = async (email, password) => {
    const data = await api.post('/api/v1/auth/login', { email, password })
    localStorage.setItem('token', data.token); setUser(data.user)
  }
  const register = async (name, email, password) => {
    const data = await api.post('/api/v1/auth/register', { name, email, password })
    localStorage.setItem('token', data.token); setUser(data.user)
  }
  const logout = () => { localStorage.removeItem('token'); setUser(null) }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}
function useAuth() { return useContext(AuthContext) }

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [navigate])
  
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [open])

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo" onClick={() => setOpen(false)}>
          <span className="logo-icon">✦</span>
          <span className="logo-text">TRIP</span>
        </Link>

        <div className="nav-search">
          <input type="text" placeholder="Rechercher un artiste, événement..."
            className="search-input"
            onKeyDown={(e) => { if (e.key === 'Enter') { navigate(`/?search=${e.target.value}`); setOpen(false) } }} />
        </div>

        <button className={`mobile-menu-btn ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className={`nav-links ${open ? 'active' : ''}`}>
          <Link to="/events" className="nav-link" onClick={() => setOpen(false)}>Événements</Link>
          <Link to="/recommendations" className="nav-link" onClick={() => setOpen(false)}>Pour vous</Link>
          {user ? (
            <>
              <Link to="/orders" className="nav-link" onClick={() => setOpen(false)}>Commandes</Link>
              <Link to="/tickets" className="nav-link" onClick={() => setOpen(false)}>Billets</Link>
              {user.role === 'ADMIN' && <Link to="/admin" className="nav-link" onClick={() => setOpen(false)}>Admin</Link>}
              <div className="user-menu">
                <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate('/'); setOpen(false) }}>Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={() => setOpen(false)}>Connexion</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Inscription</Link>
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
  const handleSearch = (e) => { e.preventDefault(); navigate(`/?search=${search}`) }

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
        <p className="hero-subtitle">Des expériences uniques. Des moments inoubliables.</p>
        <form onSubmit={handleSearch} className="hero-search">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Artiste, ville, genre..." className="hero-search-input" />
          <button type="submit" className="btn btn-primary">Rechercher</button>
        </form>
        <div className="hero-categories">
          {['concert','festival','humour','sport','theatre'].map(c => (
            <Link key={c} to={`/?category=${c}`} className="category-pill">
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedEvents({ events }) {
  const navigate = useNavigate()
  if (!events?.length) return null
  return (
    <section className="featured-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">À la une</h2>
          <Link to="/events" className="section-link">Voir tout →</Link>
        </div>
        <div className="featured-grid">
          {events.slice(0, 3).map((event, i) => (
            <div key={event.id} className={`featured-card featured-card-${i + 1}`} onClick={() => navigate(`/event/${event.id}`)}>
              <div className="featured-card-bg">
                {event.videoUrl && (isYouTubeUrl(event.videoUrl)
                  ? <iframe src={getYouTubeEmbedUrl(event.videoUrl)} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="featured-card-video" title={event.title} loading="lazy" />
                  : <div className="featured-card-image" style={{ backgroundImage: `url(${event.imageUrl || ''})` }} />
                )}
                <div className="featured-card-overlay" />
              </div>
              <div className="featured-card-content">
                <span className="featured-badge">À la une</span>
                <h3 className="featured-title">{event.title}</h3>
                <p className="featured-meta">{new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} • {event.location}</p>
                <div className="featured-footer">
                  <span className="featured-price">{event.price.toFixed(2)}€</span>
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

const CAT_LABELS = { concert:'Concert', festival:'Festival', humour:'Humour', sport:'Sport', theatre:'Théâtre', conference:'Conférence', other:'Autre' }

function EventGrid({ events, loading, title, emptyMessage }) {
  const navigate = useNavigate()
  if (loading) return (
    <div className="container">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="events-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="event-card-skeleton">
            <div className="skeleton skeleton-image" /><div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" /><div className="skeleton skeleton-text short" />
          </div>
        ))}
      </div>
    </div>
  )
  if (!events?.length) return (
    <div className="container">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="empty-state"><span className="empty-icon">✦</span><p>{emptyMessage || 'Aucun événement trouvé'}</p></div>
    </div>
  )
  return (
    <div className="container">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="events-grid">
        {events.map(event => (
          <div key={event.id} className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
            <div className="event-card-media">
              {event.videoUrl ? (
                isYouTubeUrl(event.videoUrl) ? (
                  <iframe 
                    src={getYouTubeEmbedUrl(event.videoUrl)} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                    className="event-card-video" 
                    title={event.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="event-card-video-fallback" style={{ backgroundImage: `url(${event.imageUrl || ''})` }}>
                    <span className="video-fallback-icon">▶</span>
                  </div>
                )
              ) : event.imageUrl ? (
                <div className="event-card-image" style={{ backgroundImage: `url(${event.imageUrl})` }} />
              ) : <div className="event-card-image-placeholder"><span>✦</span></div>}
              <div className="event-card-overlay" />
              <span className="event-card-category">{CAT_LABELS[event.category?.toLowerCase()] || 'Concert'}</span>
              {event.availableSeats < 50 && event.availableSeats > 0 && <span className="event-card-alert">⚡ {event.availableSeats} places</span>}
              {event.availableSeats === 0 && <span className="event-card-soldout">COMPLET</span>}
            </div>
            <div className="event-card-content">
              <h3 className="event-card-title">{event.title}</h3>
              <p className="event-card-date">{new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="event-card-location">{event.location}</p>
              <div className="event-card-footer">
                <span className="event-card-price">{event.price.toFixed(2)}€</span>
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
  const [params] = useState(() => new URLSearchParams(window.location.search))

  useEffect(() => {
    const qp = new URLSearchParams()
    const s = params.get('search'); const c = params.get('category')
    if (s) qp.set('search', s); if (c) qp.set('category', c)
    api.get(`/api/v1/events${qp.toString() ? '?' + qp : ''}`)
      .then(d => setEvents(d.events || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  const search = params.get('search'); const category = params.get('category')
  const gridTitle = search || category
    ? `Résultats${search ? ` pour "${search}"` : ''}${category ? ` — ${category}` : ''}`
    : 'Tous les événements'

  return (
    <div className="home-page">
      <Hero />
      <FeaturedEvents events={events} />
      <EventGrid events={events} loading={loading} title={gridTitle} />
    </div>
  )
}

function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ search: '', date: '', price: '', category: '' })

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    Object.entries(filter).forEach(([k, v]) => { if (v) p.set(k, v) })
    api.get(`/api/v1/events${p.toString() ? '?' + p : ''}`)
      .then(d => setEvents(d.events || [])).catch(console.error).finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="page events-page">
      <div className="container">
        <h1 className="page-title">Tous les événements</h1>
        <div className="filters-bar">
          <input type="text" placeholder="Rechercher..." className="filter-input" value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value })} />
          <select className="filter-select" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
            <option value="">Toutes catégories</option>
            {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="filter-select" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })}>
            <option value="">Toutes dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
          <select className="filter-select" value={filter.price} onChange={e => setFilter({ ...filter, price: e.target.value })}>
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
  const [paymentData, setPaymentData] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    api.get(`/api/v1/events/${id}`).then(setEvent).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  const handleOrder = async () => {
    if (!user) { navigate('/login'); return }
    setProcessing(true); setError(null)
    try {
      const orderData = await api.post('/api/v1/orders', { eventId: id, quantity })
      const paymentResponse = await api.post(`/api/v1/orders/${orderData.id}/pay`, { paymentMethod: 'card' })
      if (paymentResponse.clientSecret) { setPaymentData(paymentResponse) }
      else if (paymentResponse.tickets) { setOrder(paymentResponse) }
      else {
        const confirmData = await api.post(`/api/v1/orders/${orderData.id}/confirm`, { paymentIntentId: paymentResponse.payment?.id })
        setOrder(confirmData)
      }
    } catch (err) { setError(err.message) } finally { setProcessing(false) }
  }

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      const c = await api.post(`/api/v1/orders/${paymentData.orderId}/confirm`, { paymentIntentId })
      setOrder(c)
    } catch (err) { setError(err.message) }
  }

  const handleWaitlist = async () => {
    if (!user) { navigate('/login'); return }
    try { await api.post(`/api/v1/waitlist/${id}`); setInWaitlist(true) }
    catch (err) { setError(err.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (error) return <div className="page"><div className="container"><div className="alert alert-error">{error}</div></div></div>
  if (!event) return <div className="page"><div className="container"><div className="alert alert-error">Événement non trouvé</div></div></div>

  const bgImage = event.videoUrl && isYouTubeUrl(event.videoUrl)
    ? getYouTubeThumbnailUrl(event.videoUrl)
    : event.imageUrl || null

  const soldOut = event.availableSeats === 0

  if (order) return (
    <div className="page">
      <div className="event-detail-hero" style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <div className="event-detail-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '4rem 1.5rem' }}>
          <div className="success-card">
            <span className="success-icon">✓</span>
            <h2>Commande confirmée !</h2>
            <p>Tes billets ont été générés</p>
            <div className="tickets-grid">
              {(order.tickets || []).map((ticket, i) => (
                <div key={ticket.id} className="ticket-preview">
                  <img src={ticket.qrCode} alt="QR Code" loading="lazy" />
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

  return (
    <div className="page event-detail-page">
      <div className="event-detail-hero" style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <div className="event-detail-overlay" />
        <div className="container event-detail-header">
          <div className="event-detail-info">
            <span className="event-detail-category">{CAT_LABELS[event.category?.toLowerCase()] || 'Concert'}</span>
            <h1 className="event-detail-title">{event.title}</h1>
            <p className="event-detail-description">{event.description}</p>
            <div className="event-detail-meta">
              <span className="meta-item"><span className="meta-icon">📅</span>{new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="meta-item"><span className="meta-icon">📍</span>{event.location}</span>
              <span className="meta-item"><span className="meta-icon">🎫</span>{event.availableSeats} places disponibles</span>
            </div>
          </div>
          <div className="event-detail-card">
            {paymentData ? (
              <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret, appearance: stripeAppearance }}>
                <StripePaymentForm clientSecret={paymentData.clientSecret} amount={paymentData.amount}
                  onSuccess={handlePaymentSuccess} onCancel={() => setPaymentData(null)} />
              </Elements>
            ) : (
              <>
                <div className="price-display">
                  <span className="price-label">À partir de</span>
                  <span className="price-value">{event.price.toFixed(2)}€</span>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                {soldOut ? (
                  <div className="soldout-section">
                    <span className="soldout-badge">Complet</span>
                    <button className="btn btn-outline" onClick={handleWaitlist} disabled={inWaitlist}>
                      {inWaitlist ? '✓ Inscrit sur liste d\'attente' : 'Rejoindre la liste d\'attente'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="quantity-selector">
                      <label>Nombre de billets (max 10)</label>
                      <div className="quantity-controls">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>−</button>
                        <span>{quantity}</span>
                        <button onClick={() => setQuantity(q => Math.min(Math.min(event.availableSeats, 10), q + 1))} disabled={quantity >= Math.min(event.availableSeats, 10)}>+</button>
                      </div>
                    </div>
                    <div className="total-display">
                      <span>Total</span>
                      <span>{(event.price * quantity).toFixed(2)}€</span>
                    </div>
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleOrder} disabled={processing}>
                      {processing ? <><span className="btn-spinner" /> Traitement...</> : 'Réserver'}
                    </button>
                  </>
                )}
                <p className="secure-notice">🔒 Paiement 100% sécurisé</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StripePaymentForm({ clientSecret, amount, onSuccess, onCancel }) {
  const stripe = useStripe(); const elements = useElements()
  const [error, setError] = useState(null); const [processing, setProcessing] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!stripe || !elements) return
    setProcessing(true); setError(null)
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    })
    if (stripeError) { setError(stripeError.message); setProcessing(false) }
    else if (paymentIntent.status === 'succeeded') { onSuccess(paymentIntent.id) }
  }
  return (
    <form onSubmit={handleSubmit} className="payment-form-container">
      <h3>Paiement sécurisé</h3>
      <div className="payment-amount">{amount?.toFixed(2)}€</div>
      <div className="card-element-container">
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#fff', '::placeholder': { color: 'rgba(255,255,255,0.5)' } }, invalid: { color: '#ff4444' } } }} />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="payment-buttons">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={processing}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={!stripe || processing}>{processing ? 'Traitement...' : 'Payer'}</button>
      </div>
    </form>
  )
}

function Recommendations() {
  const [events, setEvents] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/api/v1/recommendations').then(d => setEvents(d.events || [])).catch(console.error).finally(() => setLoading(false))
  }, [])
  return (
    <div className="page">
      <div className="container">
        <div className="page-header"><h1 className="page-title">Recommandations</h1><p className="page-subtitle">Basé sur vos envies et les tendances</p></div>
        <EventGrid events={events} loading={loading} title="" />
      </div>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [error, setError] = useState(null); const { login } = useAuth(); const navigate = useNavigate()
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null)
    try { await login(email, password); navigate('/') } catch (err) { setError(err.message) }
  }
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-visual"><h2>Bon retour !</h2><p>Connectez-vous pour accéder à vos billets</p></div>
        <div className="auth-form-container">
          <h1 className="auth-title">Connexion</h1>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required /></div>
            <div className="form-group"><label className="form-label">Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required /></div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Se connecter</button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>
            Pas de compte ? <Link to="/register" style={{ color: 'var(--electric-magenta)' }}>S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Register() {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [error, setError] = useState(null); const { register } = useAuth(); const navigate = useNavigate()
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null)
    try { await register(name, email, password); navigate('/') } catch (err) { setError(err.message) }
  }
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-visual"><h2>Rejoignez l'aventure !</h2><p>Créez votre compte pour réserver vos billets</p></div>
        <div className="auth-form-container">
          <h1 className="auth-title">Inscription</h1>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Nom</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" required /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required /></div>
            <div className="form-group"><label className="form-label">Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" minLength={6} required /></div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>S'inscrire</button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>
            Déjà un compte ? <Link to="/login" style={{ color: 'var(--electric-magenta)' }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Orders() {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/api/v1/orders').then(setOrders).catch(console.error).finally(() => setLoading(false))
  }, [])
  if (loading) return <div className="loading"><div className="spinner" /></div>
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes commandes</h1>
        {!orders.length ? (
          <div className="empty-state"><span className="empty-icon">✦</span><p>Aucune commande</p><Link to="/events" className="btn btn-primary">Découvrir des événements</Link></div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-info">
                  <h3 className="order-title">{order.event.title}</h3>
                  <p className="order-meta">{new Date(order.event.date).toLocaleDateString('fr-FR')} · {order.event.location}</p>
                  <p className="order-meta">{order.quantity} billet{order.quantity > 1 ? 's' : ''} · <strong>{order.totalPrice.toFixed(2)}€</strong></p>
                </div>
                <div className="order-status">
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {{ PAID: '✓ Confirmé', PENDING: '⏳ En attente', CANCELLED: '✕ Annulé' }[order.status] || order.status}
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
  const [tickets, setTickets] = useState([]); const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState(''); const [transferName, setTransferName] = useState('')
  const [transferring, setTransferring] = useState(false); const [transferError, setTransferError] = useState(null); const [transferSuccess, setTransferSuccess] = useState(false)

  useEffect(() => {
    api.get('/api/v1/tickets').then(setTickets).catch(console.error).finally(() => setLoading(false))
  }, [])

  const closeModal = useCallback(() => {
    setSelectedTicket(null); setShowTransfer(false); setTransferEmail(''); setTransferName('')
    setTransferError(null); setTransferSuccess(false)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal])

  const handleTransfer = async (e) => {
    e.preventDefault(); setTransferring(true); setTransferError(null)
    try {
      await api.post(`/api/v1/tickets/${selectedTicket.id}/transfer`, { recipientEmail: transferEmail, recipientName: transferName })
      setTransferSuccess(true)
      setTimeout(() => { closeModal(); api.get('/api/v1/tickets').then(setTickets) }, 2000)
    } catch (err) { setTransferError(err.message) } finally { setTransferring(false) }
  }

  const isTransferable = (ticket) => {
    if (ticket.scanned) return false
    const hours = (new Date(ticket.event.date) - new Date()) / (1000 * 60 * 60)
    return hours > 48
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  
  const groupedTickets = tickets.reduce((acc, ticket) => {
    const eventId = ticket.event.id
    if (!acc[eventId]) {
      acc[eventId] = { event: ticket.event, tickets: [] }
    }
    acc[eventId].tickets.push(ticket)
    return acc
  }, {})
  
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes billets</h1>
        {!tickets.length ? (
          <div className="empty-state"><span className="empty-icon">✦</span><p>Aucun billet</p><Link to="/events" className="btn btn-primary">Réserver un événement</Link></div>
        ) : (
          <div className="tickets-container">
            {Object.values(groupedTickets).map(group => (
              <div key={group.event.id} className="ticket-group-card">
                <div className="ticket-group-info">
                  <h3 className="ticket-group-title">{group.event.title}</h3>
                  <p className="ticket-group-meta">{new Date(group.event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • {group.event.location}</p>
                  <span className="ticket-group-count">{group.tickets.length} billet{group.tickets.length > 1 ? 's' : ''}</span>
                </div>
                <div className="ticket-items-list">
                  {group.tickets.map(ticket => (
                    <div key={ticket.id} className="ticket-item" onClick={() => setSelectedTicket(ticket)}>
                      <div className="ticket-item-left">
                        <img src={ticket.qrCode} alt="QR" className="ticket-item-qr" loading="lazy" />
                        <div className="ticket-item-info">
                          <span className={`ticket-item-status ${ticket.scanned ? 'used' : 'valid'}`}>
                            {ticket.scanned ? 'Utilisé' : 'Valide'}
                          </span>
                          <span className="ticket-item-code">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                      <span className="ticket-item-arrow">›</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTicket && !showTransfer && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal-content ticket-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Fermer">×</button>
            <h3>{selectedTicket.event.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>
              {new Date(selectedTicket.event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{selectedTicket.event.location}</p>
            <img src={selectedTicket.qrCode} alt="QR Code" className="qr-code-lg" />
            {isTransferable(selectedTicket) && (
              <button className="btn btn-outline" style={{ marginTop: '1.5rem', width: '100%' }}
                onClick={(e) => { e.stopPropagation(); setShowTransfer(true) }}>
                ↗ Transférer ce billet
              </button>
            )}
          </div>
        </div>
      )}

      {showTransfer && selectedTicket && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Fermer">×</button>
            <h3 style={{ marginBottom: '0.5rem' }}>Transférer le billet</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Le bénéficiaire doit posséder un compte TRIP
            </p>
            {transferSuccess ? (
              <div className="alert alert-success">✓ Billet transféré avec succès !</div>
            ) : (
              <form onSubmit={handleTransfer}>
                {transferError && <div className="alert alert-error">{transferError}</div>}
                <div className="form-group">
                  <label className="form-label">Email du bénéficiaire *</label>
                  <input type="email" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} className="form-input" required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom (optionnel)</label>
                  <input type="text" value={transferName} onChange={e => setTransferName(e.target.value)} className="form-input" autoComplete="name" />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowTransfer(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={transferring}>
                    {transferring ? 'Transfert...' : 'Confirmer le transfert'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
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

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color || 'var(--electric-magenta)' }} />
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

function Analytics() {
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
      const a = document.createElement('a'); a.href = url
      a.download = `trip-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click(); URL.revokeObjectURL(url)
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
    const icons = {
      ORDER: '🎫',
      USER: '👤',
      EVENT: '📅',
      TICKET: '🎟️',
      PAYMENT: '💳',
      WAITLIST: '⏳'
    }
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
                  <span className="activity-message">{log.message}</span>
                  <span className="activity-time">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            ))}
            {!logs?.length && <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '1rem' }}>Aucune activité</p>}
          </div>
        </div>
      </div>

      {topEvents?.length > 0 && (
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-title">Top Événements — {period}j</h3>
          </div>
          <div className="top-events-list">
            {topEvents.map((event, i) => (
              <div key={event.id} className="top-event-row">
                <div className="top-event-rank" style={{ 
                  background: i === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : i === 1 ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' : i === 2 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' : 'var(--glass-bg)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>#{i + 1}</div>
                <div className="top-event-info">
                  <div className="top-event-name">{event.title}</div>
                  <div className="top-event-meta">
                    {event.ticketsSold} billets vendus · {event.conversionRate}% de remplissage
                  </div>
                  <ProgressBar value={event.ticketsSold} max={event.totalSeats}
                    color={i === 0 ? '#FF00FF' : i === 1 ? '#BF00FF' : '#7B00FF'} />
                </div>
                <div className="top-event-revenue">{fmtEur(event.revenue)}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200} style={{ marginTop: '1.5rem' }}>
            <BarChart data={topEvents} margin={{ top: 0, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="title" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} interval={0} angle={-20} textAnchor="end" />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenus (€)" fill="#FF00FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function Admin() {
  const [events, setEvents] = useState([]); const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('events')
  const [showEventForm, setShowEventForm] = useState(false); const [editingEvent, setEditingEvent] = useState(null)
  const [editingUser, setEditingUser] = useState(null); const [showUserForm, setShowUserForm] = useState(false)
  const [showUserHistory, setShowUserHistory] = useState(false); const [userHistory, setUserHistory] = useState(null)
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', videoUrl: '', category: 'CONCERT' })
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'USER' })
  const [userSearch, setUserSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const { user } = useAuth()

  const resetForm = () => { setFormData({ title: '', description: '', date: '', location: '', price: '', totalSeats: '', videoUrl: '', category: 'CONCERT' }); setEditingEvent(null) }

  useEffect(() => {
    if (activeTab === 'events') api.get('/api/v1/events').then(d => setEvents(d.events || [])).catch(console.error)
    else if (activeTab === 'orders') api.get('/api/v1/orders/all').then(setOrders).catch(console.error)
    else if (activeTab === 'users') api.get('/api/v1/admin/users').then(d => setUsers(d.users || [])).catch(console.error)
  }, [activeTab])

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredOrders = orders.filter(o => 
    o.user?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.user?.email?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.event?.title?.toLowerCase().includes(orderSearch.toLowerCase())
  )

  const handleViewUserHistory = async (u) => {
    try {
      const [ordersData, ticketsData] = await Promise.all([
        api.get(`/api/v1/admin/users/${u.id}/orders`),
        api.get(`/api/v1/admin/users/${u.id}/tickets`)
      ])
      setUserHistory({
        user: u,
        orders: ordersData.orders || [],
        tickets: ticketsData.tickets || []
      })
      setShowUserHistory(true)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      const dateValue = new Date(formData.date)
      if (isNaN(dateValue.getTime())) {
        alert('Date invalide')
        return
      }
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: dateValue.toISOString(),
        location: formData.location.trim(),
        price: parseFloat(formData.price),
        totalSeats: parseInt(formData.totalSeats),
        category: formData.category ? formData.category.toUpperCase() : 'CONCERT',
        videoUrl: formData.videoUrl.trim() || null
      }
      if (isNaN(eventData.price) || isNaN(eventData.totalSeats)) {
        alert('Prix et places doivent être des nombres')
        return
      }
      if (editingEvent) { 
        await api.put(`/api/v1/events/${editingEvent.id}`, eventData) 
      } else { 
        await api.post('/api/v1/events', eventData) 
      }
      setShowEventForm(false); resetForm()
      api.get('/api/v1/events').then(d => setEvents(d.events || []))
    } catch (err) { alert(err.message) }
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setFormData({ 
      title: event.title, 
      description: event.description, 
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '', 
      location: event.location, 
      price: event.price, 
      totalSeats: event.totalSeats, 
      videoUrl: event.videoUrl || '', 
      category: event.category ? event.category.toLowerCase() : 'concert' 
    })
    setShowEventForm(true)
  }

  if (user?.role !== 'ADMIN') return <div className="page"><div className="container"><p>Accès refusé</p></div></div>

  return (
    <div className="page admin-page">
      <div className="container">
        <h1 className="page-title">Administration</h1>
        <div className="admin-tabs">
          {[['events','Événements'],['orders','Commandes'],['users','Utilisateurs'],['analytics','Analytics']].map(([v,l]) => (
            <button key={v} className={`admin-tab ${activeTab === v ? 'active' : ''}`} onClick={() => setActiveTab(v)}>{l}</button>
          ))}
        </div>

        {activeTab === 'events' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => { setShowEventForm(!showEventForm); if (showEventForm) resetForm() }}>
                {showEventForm ? '✕ Annuler' : '+ Nouvel événement'}
              </button>
            </div>
            {showEventForm && (
              <div className="admin-form-card">
                <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>{editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
                <form onSubmit={handleCreateEvent}>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Titre *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="form-input" required /></div>
                    <div className="form-group"><label className="form-label">Lieu *</label><input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="form-input" required /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Description *</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-input" required /></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Catégorie</label>
                      <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="form-input filter-select" style={{ width: '100%' }}>
                        {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v.toUpperCase()}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">URL Vidéo</label><input type="url" value={formData.videoUrl} onChange={e => setFormData({ ...formData, videoUrl: e.target.value })} className="form-input" placeholder="https://..." /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Date *</label><input type="datetime-local" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="form-input" required /></div>
                    <div className="form-group"><label className="form-label">Prix (€) *</label><input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="form-input" required /></div>
                    <div className="form-group"><label className="form-label">Places *</label><input type="number" min="1" value={formData.totalSeats} onChange={e => setFormData({ ...formData, totalSeats: e.target.value })} className="form-input" required /></div>
                  </div>
                  <button type="submit" className="btn btn-primary">{editingEvent ? '✓ Mettre à jour' : '+ Créer'}</button>
                </form>
              </div>
            )}
            <div className="admin-table-container desktop-only">
              <table className="admin-table">
                <thead><tr><th>Événement</th><th>Date</th><th>Places</th><th>Prix</th><th>Catégorie</th><th>Actions</th></tr></thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id}>
                      <td className="td-title">{event.title}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(event.date).toLocaleDateString('fr-FR')}</td>
                      <td><span className={event.availableSeats === 0 ? 'text-danger' : ''}>{event.availableSeats}/{event.totalSeats}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{event.price.toFixed(2)}€</td>
                      <td><span className="event-cat-badge">{CAT_LABELS[event.category?.toLowerCase()] || event.category}</span></td>
                      <td><button className="btn btn-sm btn-outline" onClick={() => handleEditEvent(event)}>Modifier</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-cards mobile-only">
              {events.map(event => (
                <div key={event.id} className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <div className="admin-card-title">{event.title}</div>
                      <div className="admin-card-meta">{new Date(event.date).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span className="event-cat-badge">{CAT_LABELS[event.category?.toLowerCase()] || event.category}</span>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-card-row">
                      <span className="admin-card-label">Places</span>
                      <span className="admin-card-value">{event.availableSeats}/{event.totalSeats}</span>
                    </div>
                    <div className="admin-card-row">
                      <span className="admin-card-label">Prix</span>
                      <span className="admin-card-value" style={{ color: 'var(--acid-green)' }}>{event.price.toFixed(2)}€</span>
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn btn-primary" onClick={() => handleEditEvent(event)}>Modifier</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <div className="user-filters">
              <input 
                type="text" 
                placeholder="Rechercher par client, événement..." 
                className="form-input user-search"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
              />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                {filteredOrders.length} commande{filteredOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="admin-table-container desktop-only">
              <table className="admin-table">
                <thead><tr><th>Client</th><th>Événement</th><th>Qté</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td><div className="td-title">{order.user?.name}</div><div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{order.user?.email}</div></td>
                      <td className="td-title">{order.event?.title}</td>
                      <td>{order.quantity}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{order.totalPrice.toFixed(2)}€</td>
                      <td><span className={`status-badge status-${order.status.toLowerCase()}`}>{{ PAID: '✓ Payé', PENDING: '⏳ Attente', CANCELLED: '✕ Annulé' }[order.status]}</span></td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-cards mobile-only">
              {filteredOrders.map(order => (
                <div key={order.id} className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <div className="admin-card-title">{order.event?.title}</div>
                      <div className="admin-card-meta">{order.user?.name}</div>
                    </div>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status === 'PAID' ? '✓ Payé' : order.status === 'PENDING' ? '⏳ Attente' : '✕ Annulé'}</span>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-card-row">
                      <span className="admin-card-label">Email</span>
                      <span className="admin-card-value">{order.user?.email}</span>
                    </div>
                    <div className="admin-card-row">
                      <span className="admin-card-label">Quantité</span>
                      <span className="admin-card-value">{order.quantity} billet{order.quantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="admin-card-row">
                      <span className="admin-card-label">Total</span>
                      <span className="admin-card-value" style={{ color: 'var(--acid-green)' }}>{order.totalPrice.toFixed(2)}€</span>
                    </div>
                    <div className="admin-card-row">
                      <span className="admin-card-label">Date</span>
                      <span className="admin-card-value">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!filteredOrders.length && <div className="empty-state"><p>Aucune commande trouvée</p></div>}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div className="user-filters">
              <input 
                type="text" 
                placeholder="Rechercher un utilisateur..." 
                className="form-input user-search"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              <button className="btn btn-primary" onClick={() => { setShowUserForm(true); setEditingUser(null); setUserFormData({ name: '', email: '', role: 'USER' }) }}>
                + Nouvel utilisateur
              </button>
            </div>
            
            {showUserForm && (
              <div className="admin-form-card">
                <h3 style={{ marginBottom: '1.5rem' }}>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    if (editingUser) { await api.put(`/api/v1/admin/users/${editingUser.id}`, userFormData) }
                    else { await api.post('/api/v1/admin/users', userFormData) }
                    setShowUserForm(false); setEditingUser(null)
                    api.get('/api/v1/admin/users').then(d => setUsers(d.users || []))
                  } catch (err) { alert(err.message) }
                }}>
                  <div className="user-edit-modal">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nom</label>
                        <input type="text" value={userFormData.name} onChange={e => setUserFormData({ ...userFormData, name: e.target.value })} className="form-input" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} className="form-input" required={!editingUser} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rôle</label>
                      <select value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value })} className="form-input">
                        <option value="USER">Utilisateur</option>
                        <option value="ADMIN">Administrateur</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => { setShowUserForm(false); setEditingUser(null) }}>Annuler</button>
                      <button type="submit" className="btn btn-primary">{editingUser ? 'Mettre à jour' : 'Créer'}</button>
                    </div>
                  </div>
                </form>
              </div>
            )}
            
            <div className="admin-table-container desktop-only">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Inscription</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td className="td-title">{u.name}</td>
                      <td style={{ color: 'rgba(255,255,255,0.6)' }}>{u.email}</td>
                      <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role === 'ADMIN' ? 'Admin' : 'User'}</span></td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td>
                        <div className="user-table-actions">
                          <button className="btn-action btn-view" onClick={() => handleViewUserHistory(u)}>Historique</button>
                          <button className="btn-action btn-edit" onClick={() => { setEditingUser(u); setUserFormData({ name: u.name, email: u.email, role: u.role }); setShowUserForm(true) }}>Modifier</button>
                          {u.id !== user.id && (
                            <button className="btn-action btn-delete" onClick={async () => { if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) { await api.delete(`/api/v1/admin/users/${u.id}`); setUsers(prev => prev.filter(x => x.id !== u.id)) }}}>Supprimer</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-cards mobile-only">
              {filteredUsers.map(u => (
                <div key={u.id} className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <div className="admin-card-title">{u.name}</div>
                      <div className="admin-card-meta">{u.email}</div>
                    </div>
                    <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role === 'ADMIN' ? 'Admin' : 'User'}</span>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-card-row">
                      <span className="admin-card-label">Inscrit le</span>
                      <span className="admin-card-value">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn btn-outline" onClick={() => handleViewUserHistory(u)}>Historique</button>
                    <button className="btn btn-primary" onClick={() => { setEditingUser(u); setUserFormData({ name: u.name, email: u.email, role: u.role }); setShowUserForm(true) }}>Modifier</button>
                  </div>
                </div>
              ))}
            </div>
            {!filteredUsers.length && <div className="empty-state"><p>Aucun utilisateur trouvé</p></div>}
            
            {showUserHistory && userHistory && (
              <div className="modal-overlay" onClick={() => setShowUserHistory(false)}>
                <div className="modal-content user-history-modal" onClick={e => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setShowUserHistory(false)}>×</button>
                  <div className="user-history-header">
                    <div className="user-avatar" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>
                      {userHistory.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{userHistory.user.name}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{userHistory.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="user-history-stats">
                    <div className="history-stat">
                      <span className="history-stat-value">{userHistory.orders.length}</span>
                      <span className="history-stat-label">Commandes</span>
                    </div>
                    <div className="history-stat">
                      <span className="history-stat-value">{userHistory.tickets.length}</span>
                      <span className="history-stat-label">Billets</span>
                    </div>
                    <div className="history-stat">
                      <span className="history-stat-value">{userHistory.orders.reduce((a, o) => a + o.totalPrice, 0).toFixed(2)}€</span>
                      <span className="history-stat-label">Total dépensé</span>
                    </div>
                  </div>
                  
                  <div className="user-history-section">
                    <h4>Historique des commandes</h4>
                    {userHistory.orders.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.5)', padding: '1rem 0' }}>Aucune commande</p>
                    ) : (
                      <div className="history-list">
                        {userHistory.orders.map(order => (
                          <div key={order.id} className="history-item">
                            <div className="history-item-info">
                              <span className="history-item-title">{order.event?.title}</span>
                              <span className="history-item-meta">{new Date(order.createdAt).toLocaleDateString('fr-FR')} · {order.quantity} billet{order.quantity > 1 ? 's' : ''}</span>
                            </div>
                            <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status === 'PAID' ? 'Payé' : order.status}</span>
                            <span className="history-item-price">{order.totalPrice.toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="user-history-section">
                    <h4>Billets disponibles</h4>
                    {userHistory.tickets.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.5)', padding: '1rem 0' }}>Aucun billet</p>
                    ) : (
                      <div className="history-list">
                        {userHistory.tickets.map(ticket => (
                          <div key={ticket.id} className="history-item">
                            <div className="history-item-info">
                              <span className="history-item-title">{ticket.event?.title}</span>
                              <span className="history-item-meta">{new Date(ticket.event?.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <span className={`ticket-status ${ticket.scanned ? 'used' : 'valid'}`}>{ticket.scanned ? 'Utilisé' : 'Valide'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  )
}

function Waitlist() {
  const [entries, setEntries] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/api/v1/waitlist').then(d => setEntries(d.entries || [])).catch(console.error).finally(() => setLoading(false))
  }, [])
  if (loading) return <div className="loading"><div className="spinner" /></div>
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Liste d'attente</h1>
        {!entries.length ? (
          <div className="empty-state"><span className="empty-icon">✦</span><p>Aucune liste d'attente</p><Link to="/events" className="btn btn-primary">Découvrir des événements</Link></div>
        ) : (
          <div className="waitlist-grid">
            {entries.map(entry => (
              <div key={entry.id} className="waitlist-card">
                <h3>{entry.event.title}</h3>
                <p>Position #{entry.position}</p>
                <p>{new Date(entry.event.date).toLocaleDateString('fr-FR')}</p>
                <button className="btn btn-outline btn-sm" onClick={async () => { await api.delete(`/api/v1/waitlist/${entry.id}`); setEntries(prev => prev.filter(e => e.id !== entry.id)) }}>Quitter</button>
              </div>
            ))}
          </div>
        )}
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
