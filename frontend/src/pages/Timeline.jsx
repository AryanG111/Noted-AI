import React, { useState, useEffect } from 'react';
import { useAuth, API_URL, handleApiResponse } from '../context/AuthContext';
import { Clock, FileText, User, CheckSquare } from 'lucide-react';

export const Timeline = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`${API_URL}/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleApiResponse(response, 'Unable to load timeline.');
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const getEventStyles = (type) => {
    switch (type) {
      case 'note':
        return {
          color: 'var(--purple-accent)',
          bgColor: '#EDE9FE',
          icon: FileText
        };
      case 'task':
        return {
          color: 'var(--green-accent)',
          bgColor: '#E6F4EA',
          icon: CheckSquare
        };
      case 'contact':
        return {
          color: 'var(--blue-accent)',
          bgColor: '#E8F0FE',
          icon: User
        };
      default:
        return {
          color: 'var(--text-secondary)',
          bgColor: 'var(--surface-bg)',
          icon: Clock
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        Restoring timeline memory...
      </div>
    );
  }

  return (
    <div className="page-container">
      {error && (
        <div style={{
          backgroundColor: '#FCE8E6',
          color: 'var(--red-accent)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '2rem',
          border: '1px solid #FAD2CF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-accent)', fontWeight: 600 }}>✕</button>
        </div>
      )}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Memory Timeline
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your chronological thread of thoughts, connections, and commitments.
        </p>
      </div>

      {events.length === 0 ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--warm-bg)',
          border: '1.5px dashed var(--border-color)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <p className="doodle-text" style={{ fontSize: '1.25rem', color: 'var(--purple-accent)', marginBottom: '0.5rem' }}>
            ✦ Your timeline is clear
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Write some notes to start recording cognitive events.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {/* Vertical axis line */}
          <div style={{
            position: 'absolute',
            left: '9px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            borderLeft: '2.5px dashed var(--border-color)'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {events.map((event, idx) => {
              const { color, bgColor, icon: Icon } = getEventStyles(event.type);
              return (
                <div key={idx} style={{ position: 'relative', display: 'flex', gap: '1rem' }}>
                  {/* Timeline bullet node */}
                  <div style={{
                    position: 'absolute',
                    left: '-2.55rem',
                    top: '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: bgColor,
                    border: `1.5px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                  }}>
                    <Icon size={10} style={{ color: color }} />
                  </div>

                  {/* Event content card */}
                  <div className="card" style={{
                    flexGrow: 1,
                    padding: '1.25rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FFFFFF',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '0.5rem'
                    }}>
                      <h4 style={{ fontSize: '0.975rem', fontWeight: 600 }}>{event.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {formatDate(event.timestamp)}
                      </span>
                    </div>

                    <p style={{ 
                      fontSize: '0.875rem', 
                      lineHeight: '1.4', 
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {event.description}
                    </p>

                    {/* Meta Chips */}
                    {event.type === 'note' && event.tags && event.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.75rem' }}>
                        {event.tags.map((tag, tIdx) => (
                          tag.trim() && (
                            <span key={tIdx} className="badge" style={{ backgroundColor: '#F3F4F6' }}>
                              #{tag.trim()}
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    {event.type === 'task' && event.due_date && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 500,
                        color: 'var(--red-accent)',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem' 
                      }}>
                        <span>Due: {formatDate(event.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
