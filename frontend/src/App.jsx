import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import './background.js'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend
} from 'recharts'
import { CalendarView } from './CalendarView.jsx'
import { AdminDashboard } from './AdminDashboard.jsx'

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
            aria-label="Rechercher un événement"
            onKeyDown={(e) => { if (e.key === 'Enter') { navigate(`/?search=${e.target.value}`); setOpen(false) } }} />
        </div>

        <button className={`mobile-menu-btn ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className={`nav-links ${open ? 'active' : ''}`}>
          <Link to="/events" className="nav-link" onClick={() => setOpen(false)}>Événements</Link>
          <Link to="/marketplace" className="nav-link" onClick={() => setOpen(false)}>Revente</Link>
          <Link to="/calendar" className="nav-link" onClick={() => setOpen(false)}>Calendrier</Link>
          <Link to="/recommendations" className="nav-link" onClick={() => setOpen(false)}>Pour vous</Link>
          {user ? (
            <>
              <Link to="/favorites" className="nav-link" onClick={() => setOpen(false)}>Favoris</Link>
              <Link to="/orders" className="nav-link" onClick={() => setOpen(false)}>Commandes</Link>
              <Link to="/tickets" className="nav-link" onClick={() => setOpen(false)}>Billets</Link>
              <Link to="/profile" className="nav-link" onClick={() => setOpen(false)}>Profil</Link>
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

function ParticleBackground() {
  useEffect(() => {
    if (window.PsychedelicBackground) {
      new window.PsychedelicBackground('bg-canvas');
    }
    if (window.CursorEffect) {
      new window.CursorEffect();
    }
    if (window.playOpeningAnimation) {
      window.playOpeningAnimation();
    }
  }, []);
  
  return (
    <>
      <canvas id="bg-canvas" className="particle-canvas" />
      <div className="grain-overlay" />
    </>
  )
}

function OpeningAnimation() {
  useEffect(() => {
    if (window.playOpeningAnimation) {
      window.playOpeningAnimation();
    }
  }, []);
  return null
}

function Hero() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hookText, setHookText] = useState('')
  const fullHook = "Ce soir, où tu vas ?"
  const [events, setEvents] = useState([])
  const categories = [
    { key: 'CONCERT', label: 'Concert', icon: '🎵' },
    { key: 'FESTIVAL', label: 'Festival', icon: '🎪' },
    { key: 'SPORT', label: 'Sport', icon: '⚽' },
    { key: 'THEATRE', label: 'Théâtre', icon: '🎭' },
    { key: 'HUMOUR', label: 'Humour', icon: '😂' },
    { key: 'CONFERENCE', label: 'Conf.', icon: '🎤' }
  ]

  useEffect(() => {
    api.get('/api/v1/events?limit=10').then(d => setEvents(d.events || [])).catch(console.error)
  }, [])

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullHook.length) {
        setHookText(fullHook.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      const filtered = events.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.location.toLowerCase().includes(q)
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [search, events])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) navigate(`/?search=${search}`)
    setShowSuggestions(false)
  }

  const bgCategory = events[0]?.category || 'CONCERT'

  return (
    <section className="hero-section">
      <ParticleBackground />
      <OpeningAnimation />
      
      <div className="hero-bg-text">{bgCategory}</div>
      
      <div className="hero-content">
        <h1 className="hero-hook">
          {hookText}
          <span className="cursor-blink"></span>
        </h1>
        
        <form onSubmit={handleSearch} className="hero-search">
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => search.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Recherche un artiste, lieu, événement..." 
            className="hero-search-input" 
          />
          <button type="submit" className="hero-search-btn">Rechercher</button>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map(s => (
                <div 
                  key={s.id} 
                  className="suggestion-item" 
                  onClick={() => { navigate(`/event/${s.id}`); setShowSuggestions(false); setSearch(''); }}
                >
                  <span className="suggestion-title">{s.title}</span>
                  <span className="suggestion-meta">{new Date(s.date).toLocaleDateString('fr-FR')} • {s.location}</span>
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="categories-row">
          {categories.map(c => (
            <Link key={c.key} to={`/?category=${c.key}`} className="category-pill">
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="scroll-indicator">
        <span className="chevron">↓</span>
        Explorer
      </div>
    </section>
  )
}

function Skyline() {
  return (
    <section className="skyline-section">
      <svg className="skyline-layer skyline-layer-1 skyline-svg" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path fill="rgba(255,255,255,0.1)" d="M0,200 L0,150 L50,150 L50,120 L100,120 L100,160 L150,160 L150,100 L200,100 L200,140 L250,140 L250,80 L300,80 L300,130 L350,130 L350,90 L400,90 L400,150 L450,150 L450,110 L500,110 L500,160 L550,160 L550,70 L600,70 L600,140 L650,140 L650,100 L700,100 L700,150 L750,150 L750,80 L800,80 L800,130 L850,130 L850,60 L900,60 L900,120 L950,120 L950,90 L1000,90 L1000,140 L1050,140 L1050,110 L1100,110 L1100,160 L1150,160 L1150,130 L1200,130 L1200,200 Z" />
      </svg>
      <svg className="skyline-layer skyline-layer-2 skyline-svg" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path fill="rgba(255,255,255,0.15)" d="M0,200 L0,160 L40,160 L40,140 L80,140 L80,120 L120,120 L120,150 L160,150 L160,100 L200,100 L200,130 L240,130 L240,90 L280,90 L280,140 L320,140 L320,80 L360,80 L360,130 L400,130 L400,110 L440,110 L440,150 L480,150 L480,70 L520,70 L520,120 L560,120 L560,140 L600,140 L600,100 L640,100 L640,150 L680,150 L680,60 L720,60 L720,130 L760,130 L760,90 L800,90 L800,140 L840,140 L840,110 L880,110 L880,150 L920,150 L920,80 L960,80 L960,130 L1000,130 L1000,100 L1040,100 L1040,150 L1080,150 L1080,120 L1120,120 L1120,160 L1160,160 L1160,140 L1200,140 L1200,200 Z" />
      </svg>
      <svg className="skyline-layer skyline-layer-3 skyline-svg" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path fill="rgba(255,0,255,0.2)" className="neon-sign" d="M0,200 L0,170 L30,170 L30,150 L60,150 L60,170 L90,170 L90,130 L120,130 L120,170 L150,170 L150,160 L180,160 L180,140 L210,140 L210,170 L240,170 L240,120 L270,120 L270,170 L300,170 L300,155 L330,155 L330,135 L360,135 L360,170 L390,170 L390,145 L420,145 L420,170 L450,170 L450,125 L480,125 L480,170 L510,170 L510,150 L540,150 L540,170 L570,170 L570,140 L600,140 L600,170 L630,170 L630,160 L660,160 L660,130 L690,130 L690,170 L720,170 L720,115 L750,115 L750,170 L780,170 L780,145 L810,145 L810,170 L840,170 L840,135 L870,135 L870,170 L900,170 L900,155 L930,155 L930,170 L960,170 L960,140 L990,140 L990,170 L1020,170 L1020,160 L1050,160 L1050,170 L1080,170 L1080,130 L1110,130 L1110,170 L1140,170 L1140,150 L1170,150 L1170,170 L1200,170 L1200,200 Z" />
        <rect x="50" y="155" width="3" height="10" fill="rgba(255,255,200,0.8)" className="window-light" style={{animationDelay: '0.2s'}} />
        <rect x="130" y="145" width="3" height="8" fill="rgba(255,255,200,0.6)" className="window-light" style={{animationDelay: '0.5s'}} />
        <rect x="280" y="135" width="3" height="10" fill="rgba(255,255,200,0.7)" className="window-light" style={{animationDelay: '1s'}} />
        <rect x="370" y="145" width="3" height="8" fill="rgba(255,255,200,0.5)" className="window-light" style={{animationDelay: '0.8s'}} />
        <rect x="520" y="125" width="3" height="10" fill="rgba(255,255,200,0.8)" className="window-light" style={{animationDelay: '1.2s'}} />
        <rect x="690" y="135" width="3" height="8" fill="rgba(255,255,200,0.6)" className="window-light" style={{animationDelay: '0.3s'}} />
        <rect x="850" y="145" width="3" height="10" fill="rgba(255,255,200,0.7)" className="window-light" style={{animationDelay: '0.7s'}} />
        <rect x="1000" y="155" width="3" height="8" fill="rgba(255,255,200,0.5)" className="window-light" style={{animationDelay: '1.5s'}} />
      </svg>
    </section>
  )
}

function PosterCard({ event, onClick }) {
  const cardRef = useRef(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  const handleMouseMove = (e) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePos({ x, y })
    }
  }

  const handleClick = () => {
    if (cardRef.current) {
      cardRef.current.classList.add('clicking')
      setTimeout(() => onClick(), 400)
    }
  }

  const getEventImage = () => {
    if (event.imageUrl) return event.imageUrl
    const images = {
      CONCERT: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
      FESTIVAL: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
      SPORT: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
      THEATRE: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400',
      CONFERENCE: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
      HUMOUR: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400'
    }
    return images[event.category] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400'
  }

  return (
    <div 
      ref={cardRef}
      className="poster-card"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      style={{ '--mouse-x': mousePos.x + '%', '--mouse-y': mousePos.y + '%' }}
    >
      <img src={getEventImage()} alt={event.title} className="poster-image" loading="lazy" />
      <div className="poster-overlay">
        <h3 className="poster-title">{event.title}</h3>
        <p className="poster-meta">
          {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {event.location}
        </p>
        <span className="poster-price">{event.price.toFixed(2)}€</span>
      </div>
      <button className="poster-cta">Voir</button>
    </div>
  )
}

function TonightPanel({ events }) {
  const navigate = useNavigate()
  const tonightEvents = events.filter(e => {
    const eventDate = new Date(e.date)
    const today = new Date()
    const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays >= 0
  }).slice(0, 8)

  return (
    <div className="panel panel-tonight">
      <h2 className="panel-title chromatic">Ce soir</h2>
      <div className="posters-horizontal">
        {tonightEvents.map(event => (
          <PosterCard key={event.id} event={event} onClick={() => navigate(`/event/${event.id}`)} />
        ))}
      </div>
    </div>
  )
}

function TrendingPanel({ events }) {
  const navigate = useNavigate()
  const trendingEvents = [...events].sort((a, b) => b.price - a.price).slice(0, 6)
  const [viewers] = useState(Math.floor(Math.random() * 50) + 10)

  return (
    <div className="panel panel-trending">
      <h2 className="panel-title">Tendances</h2>
      <div className="live-count">
        <span className="live-dot"></span>
        <span>{viewers} personnes regardent en ce moment</span>
      </div>
      <div className="posters-horizontal">
        {trendingEvents.map(event => (
          <div key={event.id} style={{ position: 'relative' }}>
            <PosterCard event={event} onClick={() => navigate(`/event/${event.id}`)} />
            <div className="popularity-bar">
              <div className="popularity-bar-fill" style={{ width: (event.price / 300 * 100) + '%' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ForYouPanel({ events, user }) {
  const navigate = useNavigate()
  const recommended = events.slice(0, 6)

  return (
    <div className="panel panel-foryou">
      <h2 className="panel-title">{user ? 'Pour vous' : 'À découvrir'}</h2>
      <div className="posters-horizontal">
        {user && (
          <div className="mystery-card">
            <div className="mystery-front">
              <span style={{ fontSize: '3rem' }}>🎁</span>
            </div>
            <div className="mystery-back">
              <p style={{ textAlign: 'center', color: 'white' }}>Connectez-vous pour des recommandations personnalisées</p>
            </div>
          </div>
        )}
        {recommended.map(event => (
          <PosterCard key={event.id} event={event} onClick={() => navigate(`/event/${event.id}`)} />
        ))}
      </div>
    </div>
  )
}

function WidgetsRibbon({ events }) {
  const upcoming = events?.find(e => new Date(e.date) > new Date())
  const trending = events?.slice(0, 2)
  const widgets = [
    { icon: '⏱️', text: upcoming ? `${upcoming.title} - ${new Date(upcoming.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'Aucun événement à venir' },
    { icon: '🔥', text: trending?.[0] ? `${trending[0].title} - ${trending[0].price.toFixed(2)}€` : 'Tendances' },
    { icon: '👥', text: '3 nouveaux amis cette semaine' },
    { icon: '🌧️', text: 'Paris - 12°C' },
    { icon: '🎵', text: '50+ événements ce week-end' },
    { icon: '⭐', text: 'Nouveau : Festival d\'été' }
  ]

  const duplicatedWidgets = [...widgets, ...widgets]

  return (
    <div className="widgets-ribbon">
      <div className="widgets-track">
        {duplicatedWidgets.map((w, i) => (
          <div key={i} className="widget-item">
            <span>{w.icon}</span>
            <span>{w.text}</span>
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
  const { user } = useAuth() || {}

  useEffect(() => {
    const qp = new URLSearchParams()
    const s = params.get('search'); const c = params.get('category')
    if (s) qp.set('search', s); if (c) qp.set('category', c)
    api.get(`/api/v1/events${qp.toString() ? '?' + qp : ''}`)
      .then(d => setEvents(d.events || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="home-page">
      <Hero />
      <Skyline />
      <TonightPanel events={events} />
      <TrendingPanel events={events} />
      <ForYouPanel events={events} user={user} />
      <WidgetsRibbon events={events} />
    </div>
  )
}

function FeaturedEvents({ events }) {
  const navigate = useNavigate()
  if (!events?.length) return null
  
  const carouselEvents = [...events, ...events]
  
  return (
    <section className="featured-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">À la une</h2>
          <Link to="/events" className="section-link">Voir tout →</Link>
        </div>
        <div className="featured-carousel">
          <div className="featured-carousel-track">
            {carouselEvents.map((event, i) => (
              <div key={`${event.id}-${i}`} className="featured-carousel-item" onClick={() => navigate(`/event/${event.id}`)}>
                <div className="featured-carousel-card">
                  {event.imageUrl || event.videoUrl ? (
                    <div className="featured-carousel-image" style={{ backgroundImage: `url(${event.imageUrl || (event.videoUrl ? getYouTubeThumbnailUrl(event.videoUrl) : '')})` }} />
                  ) : (
                    <div className="featured-carousel-placeholder">✦</div>
                  )}
                  <div className="featured-carousel-content">
                    <span className="featured-carousel-badge">À la une</span>
                    <h3 className="featured-carousel-title">{event.title}</h3>
                    <p className="featured-carousel-meta">
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} • {event.location}
                    </p>
                    <div className="featured-carousel-footer">
                      <span className="featured-carousel-price">{event.price.toFixed(2)}€</span>
                      <span className="btn btn-sm">Voir</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ search: '', date: '', price: '', category: '' })
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 12 })

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    Object.entries(filter).forEach(([k, v]) => { if (v) p.set(k, v) })
    p.set('page', pagination.page)
    p.set('limit', pagination.limit)
    api.get(`/api/v1/events?${p.toString()}`)
      .then(d => { 
        setEvents(d.events || [])
        setPagination(prev => ({ ...prev, total: d.pagination?.total || d.total || 0 }))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, pagination.page])

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="page events-page">
      <div className="container">
        <h1 className="page-title">Tous les événements</h1>
        <div className="filters-bar">
          <input type="text" placeholder="Rechercher..." className="filter-input" value={filter.search}
            aria-label="Filtrer les événements"
            onChange={e => { setFilter({ ...filter, search: e.target.value }); setPagination(p => ({ ...p, page: 1 })) }} />
          <select className="filter-select" value={filter.category} onChange={e => { setFilter({ ...filter, category: e.target.value }); setPagination(p => ({ ...p, page: 1 })) }} aria-label="Filtrer par catégorie">
            <option value="">Toutes catégories</option>
            {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="filter-select" value={filter.date} onChange={e => { setFilter({ ...filter, date: e.target.value }); setPagination(p => ({ ...p, page: 1 })) }}>
            <option value="">Toutes dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
          <select className="filter-select" value={filter.price} onChange={e => { setFilter({ ...filter, price: e.target.value }); setPagination(p => ({ ...p, page: 1 })) }}>
            <option value="">Tous prix</option>
            <option value="asc">Prix croissant</option>
            <option value="desc">Prix décroissant</option>
          </select>
        </div>
        <EventGrid events={events} loading={loading} title="" />
        {totalPages > 1 && (
          <div className="pagination">
            <button className="pagination-btn" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} className={`pagination-btn ${pagination.page === page ? 'active' : ''}`} onClick={() => setPagination(p => ({ ...p, page }))}>{page}</button>
            ))}
            <button className="pagination-btn" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === totalPages}>›</button>
          </div>
        )}
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
  const [isFavorite, setIsFavorite] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    api.get(`/api/v1/events/${id}`).then(setEvent).catch(e => setError(e.message)).finally(() => setLoading(false))
    if (user) {
      api.get(`/api/v1/favorites/${id}/check`).then(d => setIsFavorite(d.isFavorite)).catch(() => {})
    }
  }, [id, user])

  const toggleFavorite = async () => {
    if (!user) { navigate('/login'); return }
    try {
      if (isFavorite) {
        await api.delete(`/api/v1/favorites/${id}`)
        setIsFavorite(false)
      } else {
        await api.post(`/api/v1/favorites/${id}`, {})
        setIsFavorite(true)
      }
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (!event) return
    const schema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description,
      "startDate": event.date,
      "endDate": event.date,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "location": {
        "@type": "Place",
        "name": event.location,
        "address": event.location
      },
      "image": event.imageUrl || event.videoUrl ? getYouTubeThumbnailUrl(event.videoUrl) : null,
      "offers": {
        "@type": "Offer",
        "price": event.price,
        "priceCurrency": "EUR",
        "availability": event.availableSeats > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        "validFrom": event.createdAt || new Date().toISOString()
      },
      "organizer": {
        "@type": "Organization",
        "name": "TRIP",
        "url": "https://trip.example.com"
      }
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(schema)
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [event])

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
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button className={`btn btn-sm ${isFavorite ? 'btn-primary' : 'btn-outline'}`} onClick={toggleFavorite}>
                {isFavorite ? '♥ Favori' : '♡ Ajouter aux favoris'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const text = `Regarde cet événement : ${event.title}`
                const url = window.location.origin + `/event/${event.id}`
                if (navigator.share) {
                  navigator.share({ title: event.title, text, url })
                } else {
                  navigator.clipboard.writeText(`${text} ${url}`)
                  alert('Lien copié !')
                }
              }}>Partager</button>
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
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Diminuer la quantité">−</button>
                        <span>{quantity}</span>
                        <button onClick={() => setQuantity(q => Math.min(Math.min(event.availableSeats, 10), q + 1))} disabled={quantity >= Math.min(event.availableSeats, 10)} aria-label="Augmenter la quantité">+</button>
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
                <div className="trust-badges">
                  <div className="trust-badge">
                    <span className="trust-icon">🛡️</span>
                    <span>Garantie billet valide</span>
                  </div>
                  <div className="trust-badge">
                    <span className="trust-icon">↩️</span>
                    <span>Remboursement si invalide</span>
                  </div>
                </div>
                <p className="resale-notice">
                  ℹ️ Ce billet est issu de la revente entre particuliers. 
                  Tous nos billets sont vérifiés et garantis valides.
                </p>
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
  const [search, setSearch] = useState('')
  useEffect(() => {
    api.get('/api/v1/orders').then(res => setOrders(res.orders || res)).catch(console.error).finally(() => setLoading(false))
  }, [])
  const filteredOrders = orders.filter(o => 
    o.event?.title?.toLowerCase().includes(search.toLowerCase()) ||
    o.event?.location?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  )
  if (loading) return <div className="loading"><div className="spinner" /></div>
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes commandes</h1>
        {orders.length > 0 && (
          <div className="filters-bar">
            <input type="text" placeholder="Rechercher une commande..." className="filter-input"
              value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher une commande" />
          </div>
        )}
        {!orders.length ? (
          <div className="empty-state"><span className="empty-icon">✦</span><p>Aucune commande</p><Link to="/events" className="btn btn-primary">Découvrir des événements</Link></div>
        ) : !filteredOrders.length ? (
          <div className="empty-state"><span className="empty-icon">✦</span><p>Aucun résultat pour "{search}"</p></div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map(order => (
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
            <img src={selectedTicket.qrCode} alt="QR Code" className="qr-code-lg" loading="lazy" decoding="async" />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  window.open(`/api/v1/tickets/${selectedTicket.id}/pdf`, '_blank') 
                }}
              >
                📥 Télécharger PDF
              </button>
            </div>
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
    else if (activeTab === 'orders') api.get('/api/v1/orders/all').then(d => setOrders(d.orders || d)).catch(console.error)
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

function Favorites() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/v1/favorites')
      .then(d => setEvents(d.favorites || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Mes favoris</h1>
        {!events.length ? (
          <div className="empty-state">
            <span className="empty-icon">♡</span>
            <p>Aucun favori yet</p>
            <Link to="/events" className="btn btn-primary">Découvrir des événements</Link>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
                <div className="event-card-media">
                  {event.imageUrl ? (
                    <div className="event-card-image" style={{ backgroundImage: `url(${event.imageUrl})` }} />
                  ) : <div className="event-card-image-placeholder"><span>✦</span></div>}
                  <div className="event-card-overlay" />
                  <span className="event-card-category">{CAT_LABELS[event.category?.toLowerCase()] || 'Concert'}</span>
                </div>
                <div className="event-card-content">
                  <h3 className="event-card-title">{event.title}</h3>
                  <p className="event-card-date">{new Date(event.date).toLocaleDateString('fr-FR')}</p>
                  <p className="event-card-location">{event.location}</p>
                  <div className="event-card-footer">
                    <span className="event-card-price">{event.price.toFixed(2)}€</span>
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

function Profile() {
  const { user, login: updateUserContext } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [formData, setFormData] = useState({ name: '', bio: '', avatarUrl: '' })
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' })
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  
  const [myTickets, setMyTickets] = useState([])
  const [myListings, setMyListings] = useState([])
  const [showListModal, setShowListModal] = useState(null)
  const [listPrice, setListPrice] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [listingLoading, setListingLoading] = useState(false)
  const navigate = useNavigate()

  const badges = [
    { id: 'first_ticket', name: 'Premier billet', icon: '🎫', desc: 'Acheté votre premier billet', condition: myTickets.length >= 1 },
    { id: 'event_veteran', name: 'Veteran', icon: '🎟️', desc: 'Assisté à 5 événements', condition: myTickets.filter(t => new Date(t.event.date) < new Date()).length >= 5 },
    { id: 'social_butterfly', name: 'Papillon social', icon: '🦋', desc: '10 amis', condition: friends.length >= 10 },
    { id: 'seller', name: 'Vendeur', icon: '💰', desc: 'Mis un billet en vente', condition: myListings.length >= 1 },
    { id: 'platinum', name: 'VIP', icon: '⭐', desc: 'Membre depuis plus de 6 mois', condition: profile?.createdAt && new Date() - new Date(profile.createdAt) > 180 * 24 * 60 * 60 * 1000 },
    { id: 'trendsetter', name: 'Tendances', icon: '🔥', desc: 'Post le plus liké', condition: posts.length >= 3 },
  ]

  const earnedBadges = badges.filter(b => b.condition)

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/profile/profile'),
      api.get('/api/v1/friends'),
      api.get('/api/v1/friends/requests'),
      api.get('/api/v1/friends/feed'),
      api.get('/api/v1/tickets'),
      api.get('/api/v1/tickets/listings/my')
    ]).then(([p, f, req, feed, tickets, listings]) => {
      setProfile(p)
      setFriends(f)
      setFriendRequests(req)
      setPosts(feed || [])
      setMyTickets(tickets || [])
      setMyListings(listings || [])
      setFormData({ name: p.name || '', bio: p.bio || '', avatarUrl: p.avatarUrl || '' })
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSaving(true); setMessage(null)
    try {
      const updated = await api.put('/api/v1/profile/profile', formData)
      setProfile(updated)
      updateUserContext(updated)
      setMessage({ type: 'success', text: 'Profil mis à jour !' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault(); setSaving(true); setMessage(null)
    try {
      await api.put('/api/v1/profile/password', passwordData)
      setMessage({ type: 'success', text: 'Mot de passe modifié !' })
      setPasswordData({ currentPassword: '', newPassword: '' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleSearchFriends = async (query) => {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    try {
      const results = await api.get(`/api/v1/friends/search?q=${encodeURIComponent(query)}`)
      setSearchResults(results)
    } catch (err) { console.error(err) }
  }

  const handleSendRequest = async (userId) => {
    try {
      await api.post(`/api/v1/friends/request/${userId}`)
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, requestSent: true } : u))
      setMessage({ type: 'success', text: 'Demande d\'ami envoyée !' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.put(`/api/v1/friends/request/${requestId}/accept`)
      const updated = await api.get('/api/v1/friends')
      const requests = await api.get('/api/v1/friends/requests')
      setFriends(updated)
      setFriendRequests(requests)
      setMessage({ type: 'success', text: 'Ami ajouté !' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }

  const handleRejectRequest = async (requestId) => {
    try {
      await api.put(`/api/v1/friends/request/${requestId}/reject`)
      const requests = await api.get('/api/v1/friends/requests')
      setFriendRequests(requests)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.delete(`/api/v1/friends/${friendId}`)
      setFriends(prev => prev.filter(f => f.id !== friendId))
      setMessage({ type: 'success', text: 'Ami supprimé' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newPost.trim()) return
    setPosting(true)
    try {
      const post = await api.post('/api/v1/friends/posts', { content: newPost })
      setPosts([post, ...posts])
      setNewPost('')
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setPosting(false) }
  }

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/api/v1/friends/posts/${postId}`)
      setPosts(posts.filter(p => p.id !== postId))
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }

  const handleCreateListing = async (ticketId) => {
    setListingLoading(true)
    try {
      const listing = await api.post(`/api/v1/tickets/${ticketId}/list`, {
        price: parseFloat(listPrice),
        description: listDescription || null
      })
      setMyListings([listing, ...myListings])
      setShowListModal(null)
      setListPrice('')
      setListDescription('')
      setMessage({ type: 'success', text: 'Billet mis en vente !' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setListingLoading(false)
    }
  }

  const handleCancelListing = async (listingId) => {
    try {
      await api.delete(`/api/v1/tickets/listings/${listingId}`)
      setMyListings(myListings.filter(l => l.id !== listingId))
      setMessage({ type: 'success', text: 'Annonce supprimée' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }

  const groupedMyTickets = myTickets.reduce((acc, ticket) => {
    const eventId = ticket.event.id
    if (!acc[eventId]) {
      acc[eventId] = { event: ticket.event, tickets: [], isPast: new Date(ticket.event.date) < new Date() }
    }
    acc[eventId].tickets.push(ticket)
    return acc
  }, {})

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <div className="profile-cover" />
        <div className="container">
          <div className="profile-info">
            <div className="profile-avatar-wrapper">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="profile-avatar" />
              ) : (
                <div className="profile-avatar-placeholder">{profile?.name?.charAt(0)?.toUpperCase() || '?'}</div>
              )}
            </div>
            <div className="profile-details">
              <h1 className="profile-name">{profile?.name}</h1>
              <p className="profile-bio">{profile?.bio || 'Aucune bio'}</p>
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-value">{friends.length}</span>
                  <span className="stat-label">Amis</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{myTickets.length}</span>
                  <span className="stat-label">Billets</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{earnedBadges.length}</span>
                  <span className="stat-label">Badges</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {earnedBadges.length > 0 && (
          <div className="profile-badges">
            <div className="container">
              <div className="badges-row">
                {earnedBadges.map(badge => (
                  <div key={badge.id} className="badge-item" title={badge.desc}>
                    <span className="badge-icon">{badge.icon}</span>
                    <span className="badge-name">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="container">
        {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text}</div>}

        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profil</button>
          <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Mes Events</button>
          <button className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>Mes Billets</button>
          <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Amis</button>
          <button className={`tab-btn ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>Communauté</button>
        </div>

        {activeTab === 'profile' && (
          <div className="profile-content">
            <div className="admin-form-card">
              <h3>Informations du profil</h3>
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">Avatar URL</label>
                  <input type="url" className="form-input" value={formData.avatarUrl}
                    onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                    placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input type="text" className="form-input" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={user?.email || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-input" value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3}
                    placeholder="Parle-nous de toi..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            </div>

            <div className="admin-form-card">
              <h3>Changer le mot de passe</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Mot de passe actuel</label>
                  <input type="password" className="form-input" value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input type="password" className="form-input" value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                    minLength={6} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="profile-content">
            <h3 style={{ marginBottom: '1.5rem' }}>Mes événements à venir</h3>
            {Object.values(groupedMyTickets).filter(g => !g.isPast).length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🎵</span>
                <p>Vous n'avez pas encore de billets pour des événements à venir</p>
                <Link to="/events" className="btn btn-primary">Découvrir des événements</Link>
              </div>
            ) : (
              <div className="my-events-grid">
                {Object.values(groupedMyTickets).filter(g => !g.isPast).map(group => (
                  <div key={group.event.id} className="my-event-card" onClick={() => navigate(`/event/${group.event.id}`)}>
                    <div className="my-event-image" style={{ backgroundImage: group.event.imageUrl ? `url(${group.event.imageUrl})` : undefined }}>
                      {!group.event.imageUrl && <span className="my-event-placeholder">🎵</span>}
                      <div className="my-event-overlay" />
                    </div>
                    <div className="my-event-info">
                      <h4 className="my-event-title">{group.event.title}</h4>
                      <p className="my-event-meta">
                        {new Date(group.event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • {group.event.location}
                      </p>
                      <span className="my-event-count">{group.tickets.length} billet{group.tickets.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Object.values(groupedMyTickets).filter(g => g.isPast).length > 0 && (
              <>
                <h3 style={{ margin: '2rem 0 1.5rem' }}>Événements passés</h3>
                <div className="my-events-grid past-events">
                  {Object.values(groupedMyTickets).filter(g => g.isPast).map(group => (
                    <div key={group.event.id} className="my-event-card past" onClick={() => navigate(`/event/${group.event.id}`)}>
                      <div className="my-event-image" style={{ backgroundImage: group.event.imageUrl ? `url(${group.event.imageUrl})` : undefined }}>
                        {!group.event.imageUrl && <span className="my-event-placeholder">🎵</span>}
                      </div>
                      <div className="my-event-info">
                        <h4 className="my-event-title">{group.event.title}</h4>
                        <p className="my-event-meta">{new Date(group.event.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="profile-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Mes billets</h3>
              <Link to="/tickets" className="btn btn-outline btn-sm">Voir tous mes billets</Link>
            </div>
            
            {myTickets.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🎫</span>
                <p>Vous n'avez pas de billets</p>
                <Link to="/events" className="btn btn-primary">Réserver un événement</Link>
              </div>
            ) : (
              <>
                <div className="resale-section">
                  <h4 style={{ marginBottom: '1rem' }}>Mettre en vente un billet</h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Vous pouvez revendre vos billets pour des événements à venir
                  </p>
                  <div className="resale-tickets-grid">
                    {myTickets.filter(t => !t.scanned && new Date(t.event.date) > new Date()).map(ticket => {
                      const hasListing = myListings.some(l => l.ticketId === ticket.id && l.status === 'ACTIVE')
                      return (
                        <div key={ticket.id} className="resale-ticket-card">
                          <div className="resale-ticket-info">
                            <h5>{ticket.event.title}</h5>
                            <p>{new Date(ticket.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {ticket.event.location}</p>
                            {hasListing ? (
                              <span className="listing-badge listed">En vente</span>
                            ) : (
                              <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => setShowListModal(ticket)}
                              >
                                Mettre en vente
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {myListings.length > 0 && (
                  <div className="my-listings-section" style={{ marginTop: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Mes annonces actives</h4>
                    <div className="listings-grid">
                      {myListings.filter(l => l.status === 'ACTIVE').map(listing => (
                        <div key={listing.id} className="listing-card">
                          <div className="listing-info">
                            <h5>{listing.ticket.event.title}</h5>
                            <p>{new Date(listing.ticket.event.date).toLocaleDateString('fr-FR')}</p>
                            <span className="listing-price">{listing.price.toFixed(2)}€</span>
                          </div>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => handleCancelListing(listing.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {showListModal && (
              <div className="modal-overlay" onClick={() => setShowListModal(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setShowListModal(null)}>×</button>
                  <h3 style={{ marginBottom: '0.5rem' }}>Mettre en vente</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    {showListModal.event.title}
                  </p>
                  <div className="form-group">
                    <label className="form-label">Prix de vente (€)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="form-input"
                      value={listPrice}
                      onChange={e => setListPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (optionnel)</label>
                    <textarea 
                      className="form-input"
                      value={listDescription}
                      onChange={e => setListDescription(e.target.value)}
                      placeholder="Informações supplémentaires..."
                      rows={3}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowListModal(null)}>Annuler</button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 2 }}
                      disabled={!listPrice || listingLoading}
                      onClick={() => handleCreateListing(showListModal.id)}
                    >
                      {listingLoading ? 'Publication...' : 'Publier'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="profile-content">
            {friendRequests.length > 0 && (
              <div className="friend-requests-section">
                <h3>Demandes d'ami ({friendRequests.length})</h3>
                <div className="friend-requests-list">
                  {friendRequests.map(req => (
                    <div key={req.id} className="friend-request-card">
                      <div className="friend-request-avatar">
                        {req.sender.avatarUrl ? (
                          <img src={req.sender.avatarUrl} alt={req.sender.name} />
                        ) : (
                          <span>{req.sender.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="friend-request-info">
                        <span className="friend-request-name">{req.sender.name}</span>
                        <span className="friend-request-bio">{req.sender.bio || ''}</span>
                      </div>
                      <div className="friend-request-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleAcceptRequest(req.id)}>Accepter</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleRejectRequest(req.id)}>Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="search-friends-section">
              <h3>Ajouter des amis</h3>
              <input type="text" className="form-input" placeholder="Rechercher des utilisateurs..."
                value={searchQuery} onChange={e => handleSearchFriends(e.target.value)} />
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(u => (
                    <div key={u.id} className="search-result-item">
                      <div className="search-result-avatar">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} /> : <span>{u.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="search-result-info">
                        <span className="search-result-name">{u.name}</span>
                        <span className="search-result-bio">{u.bio || ''}</span>
                      </div>
                      <div className="search-result-action">
                        {u.isFriend ? (
                          <span className="already-friend">Déjà ami</span>
                        ) : u.requestSent ? (
                          <span className="request-sent">En attente</span>
                        ) : u.requestReceived ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleAcceptRequest(u.id)}>Accepter</button>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSendRequest(u.id)}>Ajouter</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="friends-list-section">
              <h3>Mes amis ({friends.length})</h3>
              {friends.length === 0 ? (
                <p className="empty-state">Vous n'avez pas encore d'amis. Recherchez des utilisateurs pour commencer !</p>
              ) : (
                <div className="friends-grid">
                  {friends.map(friend => (
                    <div key={friend.id} className="friend-card">
                      <div className="friend-card-avatar">
                        {friend.avatarUrl ? <img src={friend.avatarUrl} alt={friend.name} /> : <span>{friend.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <span className="friend-card-name">{friend.name}</span>
                      <span className="friend-card-bio">{friend.bio || ''}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => handleRemoveFriend(friend.id)}>Supprimer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="profile-content">
            <div className="community-feed">
              <div className="create-post-card">
                <h3>Partager avec vos amis</h3>
                <form onSubmit={handleCreatePost}>
                  <textarea className="form-input" placeholder="Qu'avez-vous en tête ? Parlez de vos événements préférés..."
                    value={newPost} onChange={e => setNewPost(e.target.value)} rows={3} />
                  <button type="submit" className="btn btn-primary" disabled={posting || !newPost.trim()}>
                    {posting ? 'Publication...' : 'Publier'}
                  </button>
                </form>
              </div>

              <div className="posts-list">
                <h3>Fil d'actualité</h3>
                {posts.length === 0 ? (
                  <p className="empty-state">Aucune publication. Ajoutez des amis pour voir leurs publications !</p>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className="post-card">
                      <div className="post-header">
                        <div className="post-author-avatar">
                          {post.user.avatarUrl ? <img src={post.user.avatarUrl} alt={post.user.name} /> : <span>{post.user.name.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="post-author-info">
                          <span className="post-author-name">{post.user.name}</span>
                          <span className="post-date">{new Date(post.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {post.user.id === user?.id && (
                          <button className="post-delete-btn" onClick={() => handleDeletePost(post.id)}>×</button>
                        )}
                      </div>
                      <div className="post-content">{post.content}</div>
                      {post.event && (
                        <div className="post-event">
                          <span className="post-event-label">Événement lié:</span>
                          <span className="post-event-title">{post.event.title}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ComingSoon() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/v1/waitlist/general', { email })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-hero">
        <div className="coming-soon-content">
          <span className="coming-soon-badge">Bientot disponible</span>
          <h1 className="coming-soon-title">
            <span className="title-line">VIBREZ</span>
            <span className="title-line accent">AVEC TRIP</span>
          </h1>
          <p className="coming-soon-subtitle">
            La nouvelle plateforme de billetterie arrive. Soyez les premiers informés des événements exclusifs.
          </p>
          
          {submitted ? (
            <div className="coming-soon-success">
              <span className="success-icon">✓</span>
              <p>Vous êtes inscrit ! Nous vous contacterons dès qu'un nouvel événement sera disponible.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="coming-soon-form">
              <div className="form-group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre email pour être alerté en priorité"
                  className="form-input coming-soon-input"
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Envoi...' : 'Être alerté'}
                </button>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
            </form>
          )}

          <div className="coming-soon-features">
            <div className="feature-item">
              <span className="feature-icon">🎫</span>
              <span>Billets garantis</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Paiement sécurisé</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💰</span>
              <span>Meilleurs prix</span>
            </div>
          </div>
        </div>
        
        <div className="coming-soon-visual">
          <div className="visual-circle"></div>
          <div className="visual-circle delay-1"></div>
          <div className="visual-circle delay-2"></div>
          <span className="visual-icon">✦</span>
        </div>
      </div>

      <div className="coming-soon-footer-notice">
        <p>🔄 Revente entre particuliers • Tous les billets sont vérifiés et garantis valides</p>
      </div>
    </div>
  )
}

function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/v1/events?upcoming=true')
      .then(d => setEvents(d.events || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Calendrier des événements</h1>
        <CalendarView events={events} />
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

function AdminWrapper() {
  const { user, logout, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'ADMIN') return <Navigate to="/" />
  return <AdminDashboard user={user} onLogout={logout} />
}

function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, name: user.name || '', email: user.email || '' }))
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/v1/contact', formData)
      setSubmitted(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page contact-page">
      <div className="container">
        <div className="contact-container">
          <div className="contact-info">
            <h1 className="page-title">Contactez-nous</h1>
            <p className="contact-subtitle">Une question ? Besoin d'aide ? Nous sommes là pour vous.</p>
            
            <div className="contact-methods">
              <div className="contact-method">
                <span className="contact-icon">📧</span>
                <div>
                  <h4>Email</h4>
                  <p>support@trip.example.com</p>
                </div>
              </div>
              <div className="contact-method">
                <span className="contact-icon">📞</span>
                <div>
                  <h4>Téléphone</h4>
                  <p>Lun-Ven: 9h-18h</p>
                </div>
              </div>
              <div className="contact-method">
                <span className="contact-icon">💬</span>
                <div>
                  <h4>FAQ</h4>
                  <p>Réponses aux questions fréquentes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            {submitted ? (
              <div className="success-message">
                <span className="success-icon">✓</span>
                <h3>Message envoyé !</h3>
                <p>Nous vous répondrons dans les plus brefs délais.</p>
                <button className="btn btn-primary" onClick={() => setSubmitted(false)}>Envoyer un autre message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <h3>Envoyez-nous un message</h3>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sujet</label>
                  <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="form-input" required>
                    <option value="">Sélectionnez un sujet</option>
                    <option value="order">Question sur une commande</option>
                    <option value="ticket">Problème avec un billet</option>
                    <option value="payment">Paiement</option>
                    <option value="account">Mon compte</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="form-input" rows={5} required placeholder="Décrivez votre problème..." />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Legal() {
  const { type } = useParams()
  
  const content = {
    terms: {
      title: 'Conditions Générales d\'Utilisation',
      lastUpdate: 'Dernière mise à jour : Février 2026',
      sections: [
        { title: '1. Acceptance des conditions', content: 'En utilisant TRIP, vous acceptez ces conditions. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.' },
        { title: '2. Description du service', content: 'TRIP est une plateforme de revente de billets entre particuliers. Nous facilitons l\'achat et la vente de billets d\'événements.' },
        { title: '3. Compte utilisateur', content: 'Vous devez créer un compte pour acheter ou vendre des billets. Vous êtes responsable de la confidentialité de votre mot de passe.' },
        { title: '4. Achat de billets', content: 'Les billets achetés sur TRIP sont garantis valides. En cas de billet invalide, nous proposons un remboursement intégral.' },
        { title: '5. Vente de billets', content: 'Vous pouvez vendre vos billets sur notre plateforme. Les billets doivent être légitime et correspondre à l\'événement indiqué.' },
        { title: '6. Paiement et frais', content: 'Les paiements sont sécurisés via Stripe. Des frais de service s\'appliquent sur chaque transaction.' },
        { title: '7. Responsabilité', content: 'TRIP agit comme intermédiaire entre acheteurs et vendeurs. Nous ne sommes pas responsables des annulations d\'événements.' }
      ]
    },
    privacy: {
      title: 'Politique de Confidentialité',
      lastUpdate: 'Dernière mise à jour : Février 2026',
      sections: [
        { title: '1. Collecte des données', content: 'Nous collectons les données nécessaires au fonctionnement du service : nom, email, historique d\'achats.' },
        { title: '2. Utilisation des données', content: 'Vos données sont utilisées pour : traiter vos commandes, améliorer notre service, vous informer des événements.' },
        { title: '3. Protection des données', content: 'Nous mettons en œuvre des mesures de sécurité pour protéger vos données personnelles.' },
        { title: '4. Cookies', content: 'Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez les désactiver dans votre navigateur.' },
        { title: '5. Partage des données', content: 'Vos données ne sont pas vendues à des tiers. Elles peuvent être partagées avec nos prestataires de paiement.' }
      ]
    },
    refund: {
      title: 'Politique de Remboursement',
      lastUpdate: 'Dernière mise à jour : Février 2026',
      sections: [
        { title: '1. Billet invalide', content: 'Si votre billet est invalide à l\'entrée, nous vous remboursons intégralement sous 7 jours.' },
        { title: '2. Événement annulé', content: 'En cas d\'annulation par l\'organisateur, nous remboursons les billets selon les conditions de l\'organisateur.' },
        { title: '3. Demande de remboursement', content: 'Contactez-nous via le formulaire de contact en précisant votre numéro de commande.' },
        { title: '4. Délai de traitement', content: 'Les remboursements sont traités sous 5 à 10 jours ouvrés.' }
      ]
    }
  }

  const current = content[type] || content.terms

  return (
    <div className="page legal-page">
      <div className="container">
        <div className="legal-container">
          <h1 className="page-title">{current.title}</h1>
          <p className="legal-updated">{current.lastUpdate}</p>
          
          {current.sections.map((section, i) => (
            <div key={i} className="legal-section">
              <h3>{section.title}</h3>
              <p>{section.content}</p>
            </div>
          ))}
          
          <div className="legal-contact">
            <p>Questions ? <Link to="/contact">Contactez-nous</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  const navigate = useNavigate()
  
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <Link to="/" className="footer-logo">
              <span className="logo-icon">✦</span>
              <span className="logo-text">TRIP</span>
            </Link>
            <p className="footer-desc">Vibrez différemment. Des expériences uniques.</p>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-title">Explorer</h4>
            <Link to="/events" className="footer-link">Événements</Link>
            <Link to="/calendar" className="footer-link">Calendrier</Link>
            <Link to="/recommendations" className="footer-link">Pour vous</Link>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-title">Légal</h4>
            <Link to="/legal/terms" className="footer-link">CGV</Link>
            <Link to="/legal/privacy" className="footer-link">Confidentialité</Link>
            <Link to="/legal/refund" className="footer-link">Remboursement</Link>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-title">Contact</h4>
            <Link to="/contact" className="footer-link">Nous contacter</Link>
            <Link to="/coming-soon" className="footer-link">À venir</Link>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} TRIP. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}

function Marketplace() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState('newest')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/tickets/listings')
      setListings(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredListings = listings
    .filter(l => {
      if (category && l.ticket.event.category !== category) return false
      if (priceRange.min && l.price < parseFloat(priceRange.min)) return false
      if (priceRange.max && l.price > parseFloat(priceRange.max)) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  const handleBuy = async (listingId) => {
    if (!user) { navigate('/login'); return }
    try {
      const result = await api.post(`/api/v1/tickets/listings/${listingId}/buy`)
      alert(result.message)
      loadListings()
    } catch (err) {
      alert(err.message)
    }
  }

  const getEventImage = (listing) => {
    if (listing.ticket.event.imageUrl) return listing.ticket.event.imageUrl
    const cat = listing.ticket.event.category
    const images = {
      CONCERT: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
      FESTIVAL: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
      SPORT: 'https://images.unsplash.com/photo-1461896836934- voices0d6?w=400',
      THEATRE: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400',
      CONFERENCE: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
      HUMOUR: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400'
    }
    return images[cat] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400'
  }

  const categories = ['CONCERT', 'FESTIVAL', 'SPORT', 'THEATRE', 'CONFERENCE', 'HUMOUR']
  const categoryLabels = {
    CONCERT: 'Concert', FESTIVAL: 'Festival', SPORT: 'Sport',
    THEATRE: 'Théâtre', CONFERENCE: 'Conférence', HUMOUR: 'Humour'
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page marketplace-page">
      <div className="container">
        <h1 className="page-title">Marketplace</h1>
        <p className="page-subtitle" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
          Achetez et vendez vos billets entre particuliers
        </p>
        
        <div className="marketplace-filters">
          <div className="filter-group">
            <label className="filter-label">Catégorie</label>
            <select 
              className="filter-select" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Toutes</option>
              {categories.map(c => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Prix min</label>
            <input 
              type="number" 
              className="filter-input" 
              placeholder="0€"
              value={priceRange.min}
              onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Prix max</label>
            <input 
              type="number" 
              className="filter-input" 
              placeholder="500€"
              value={priceRange.max}
              onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Trier par</label>
            <select 
              className="filter-select" 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Plus récents</option>
              <option value="price-low">Prix croissant</option>
              <option value="price-high">Prix décroissant</option>
            </select>
          </div>
        </div>
        
        {filteredListings.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎫</span>
            <p>{listings.length === 0 ? 'Aucun billet en vente actuellement' : 'Aucun résultat pour ces filtres'}</p>
            {user && listings.length === 0 && <Link to="/profile" className="btn btn-primary">Mettre en vente un billet</Link>}
          </div>
        ) : (
          <div className="events-grid">
            {filteredListings.map(listing => (
              <div key={listing.id} className="event-card marketplace-card">
                <div className="event-card-media">
                  <div 
                    className="event-card-image" 
                    style={{ backgroundImage: `url(${getEventImage(listing)})` }} 
                  />
                  <div className="event-card-overlay" />
                  <span className="event-card-category" style={{ background: 'var(--primary)' }}>
                    {categoryLabels[listing.ticket.event.category] || 'Revente'}
                  </span>
                  {listing.ticket.event.date && (
                    <div className="event-countdown" style={{
                      position: 'absolute', bottom: '10px', left: '10px',
                      background: 'rgba(0,0,0,0.7)', padding: '4px 8px',
                      borderRadius: '4px', fontSize: '0.75rem'
                    }}>
                      {new Date(listing.ticket.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
                <div className="event-card-content">
                  <h3 className="event-card-title">{listing.ticket.event.title}</h3>
                  <p className="event-card-date">
                    {listing.ticket.event.location}
                  </p>
                  <div className="seller-info">
                    <span className="seller-avatar">{listing.seller?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    <span className="seller-name">{listing.seller?.name || 'Vendeur'}</span>
                  </div>
                  <div className="event-card-footer">
                    <div className="price-info">
                      <span className="event-card-price" style={{ color: 'var(--acid-green)' }}>
                        {listing.price.toFixed(2)}€
                      </span>
                      {listing.ticket.event.price && (
                        <span className="original-price" style={{ 
                          color: 'rgba(255,255,255,0.4)', 
                          textDecoration: 'line-through',
                          fontSize: '0.8rem',
                          marginLeft: '8px'
                        }}>
                          {listing.ticket.event.price}€
                        </span>
                      )}
                    </div>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={(e) => { e.stopPropagation(); handleBuy(listing.id) }}
                    >
                      Acheter
                    </button>
                  </div>
                  {listing.description && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                      {listing.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal/:type" element={<Legal />} />
          <Route path="/waitlist" element={<ProtectedRoute><Waitlist /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/admin" element={<AdminWrapper />} />
        </Routes>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}
