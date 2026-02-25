import { useState } from 'react'
import { Link } from 'react-router-dom'

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function CalendarView({ events = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  
  const getEventsForDay = (day) => {
    const date = new Date(year, month, day)
    return events.filter(e => {
      const eventDate = new Date(e.date)
      return eventDate.getDate() === day && 
             eventDate.getMonth() === month && 
             eventDate.getFullYear() === year
    })
  }

  const today = new Date()
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="btn btn-outline btn-sm" onClick={prevMonth}>← Précédent</button>
        <h3>{MONTHS[month]} {year}</h3>
        <button className="btn btn-outline btn-sm" onClick={nextMonth}>Suivant →</button>
      </div>
      
      <div className="calendar-grid">
        {DAYS.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        
        {[...Array(firstDay)].map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty" />
        ))}
        
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1
          const dayEvents = getEventsForDay(day)
          return (
            <div key={day} className={`calendar-day ${isToday(day) ? 'today' : ''} ${dayEvents.length ? 'has-events' : ''}`}>
              <span className="day-number">{day}</span>
              {dayEvents.slice(0, 2).map(event => (
                <Link key={event.id} to={`/event/${event.id}`} className="calendar-event" title={event.title}>
                  {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                </Link>
              ))}
              {dayEvents.length > 2 && <span className="more-events">+{dayEvents.length - 2}</span>}
            </div>
          )
        })}
      </div>
      
      <style>{`
        .calendar-container {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
        }
        .calendar-header h3 {
          font-family: var(--font-display);
          margin: 0;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .calendar-day-header {
          text-align: center;
          padding: var(--space-2);
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          font-size: 0.8rem;
        }
        .calendar-day {
          min-height: 80px;
          padding: var(--space-2);
          background: rgba(255,255,255,0.02);
          border-radius: var(--radius-sm);
          position: relative;
        }
        .calendar-day.empty {
          background: transparent;
        }
        .calendar-day.today {
          background: rgba(255,0,255,0.1);
          border: 1px solid var(--electric-magenta);
        }
        .calendar-day.has-events {
          cursor: pointer;
        }
        .day-number {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .calendar-event {
          display: block;
          font-size: 0.7rem;
          padding: 2px 4px;
          margin-top: 2px;
          background: var(--electric-magenta);
          border-radius: 3px;
          color: #fff;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .more-events {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.5);
        }
        @media (max-width: 768px) {
          .calendar-day {
            min-height: 50px;
            padding: 2px;
          }
          .calendar-event {
            display: none;
          }
          .calendar-day.has-events::after {
            content: '•';
            position: absolute;
            top: 2px;
            right: 2px;
            color: var(--electric-magenta);
          }
        }
      `}</style>
    </div>
  )
}
