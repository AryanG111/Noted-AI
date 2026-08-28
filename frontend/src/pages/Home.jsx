import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Search, Send, FileText, CheckSquare, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Lottie } from 'lottie-react';
import ReactMarkdown from 'react-markdown';
import loaderAnimation from '../assets/loader.json';
import successAnimation from '../assets/success.json';
import emptyAnimation from '../assets/empty.json';

export const Home = () => {
  const { token, activeKernel, user } = useAuth();
  const navigate = useNavigate();

  // Q&A Chat State
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Thinking...');
  const [citations, setCitations] = useState([]);

  // Command Palette State
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Dashboard states
  const [recentTasks, setRecentTasks] = useState([]);
  const [notesCount, setNotesCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [proactiveReminder, setProactiveReminder] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette(prev => !prev);
        setPaletteQuery('');
        setSelectedIndex(0);
      }
      
      if (showPalette) {
        const items = getFilteredPaletteItems();
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowPalette(false);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % (items.length || 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + items.length) % (items.length || 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (items[selectedIndex]) {
            items[selectedIndex].action();
            setShowPalette(false);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPalette, selectedIndex, recentNotes, recentTasks, allContacts, paletteQuery]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch pending tasks
      const tasksRes = await fetch(`${API_URL}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setRecentTasks(data.filter(t => t.status !== 'done').slice(0, 3));
      } else {
        const err = await tasksRes.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch tasks (HTTP ${tasksRes.status})`);
      }
      
      // 2. Fetch notes count & recent notes
      const notesRes = await fetch(`${API_URL}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notesRes.ok) {
        const notes = await notesRes.json();
        setNotesCount(notes.length);
        setRecentNotes(notes.slice(0, 3));
      } else {
        const err = await notesRes.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch notes (HTTP ${notesRes.status})`);
      }

      // 3. Fetch proactive reminder
      const reminderRes = await fetch(`${API_URL}/search/proactive`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reminderRes.ok) {
        const reminderData = await reminderRes.json();
        setProactiveReminder(reminderData.reminder || '');
      } else {
        const err = await reminderRes.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch reminders (HTTP ${reminderRes.status})`);
      }

      // 4. Fetch contacts for palette
      const contactsRes = await fetch(`${API_URL}/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contactsRes.ok) {
        setAllContacts(await contactsRes.json());
      }
    } catch (e) {
      console.error("Error loading dashboard details:", e);
      setError(e.message || "Unable to connect to the backend server.");
    }
  };

  const getFilteredPaletteItems = () => {
    const items = [];
    
    // Add Notes
    recentNotes.forEach(n => {
      items.push({
        type: 'note',
        id: n.id,
        title: n.title || 'Untitled Note',
        subtitle: n.summary || 'Open memory note',
        action: () => navigate('/notes')
      });
    });
    
    // Add Tasks
    recentTasks.forEach(t => {
      items.push({
        type: 'task',
        id: t.id,
        title: t.description,
        subtitle: 'Active commitment',
        action: () => navigate('/tasks')
      });
    });
    
    // Add Contacts
    allContacts.forEach(c => {
      items.push({
        type: 'contact',
        id: c.id,
        title: c.name,
        subtitle: c.role || 'Contact',
        action: () => navigate('/contacts')
      });
    });
    
    if (!paletteQuery.trim()) return items.slice(0, 8);
    
    return items.filter(item => 
      item.title.toLowerCase().includes(paletteQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(paletteQuery.toLowerCase())
    ).slice(0, 8);
  };

  const formatTaskDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const handleAskNoted = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    
    setChatLoading(true);
    setChatResponse('');
    setCitations([]);
    
    // Rotate loading status to feel premium & smart
    setLoadingStatus('Thinking...');
    const status1 = setTimeout(() => setLoadingStatus('Searching memory...'), 1000);
    const status2 = setTimeout(() => setLoadingStatus('Reasoning...'), 2400);
    
    try {
      const response = await fetch(`${API_URL}/search/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Active-Kernel': activeKernel
        },
        body: JSON.stringify({ query: chatQuery.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatResponse(data.answer);
        setCitations(data.citations || []);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Recall failed (HTTP ${response.status})`);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to reach your local AI model.");
    } finally {
      clearTimeout(status1);
      clearTimeout(status2);
      setChatLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  return (
    <div style={{ padding: '3rem 2.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      
      {/* Dynamic Alert Banner */}
      {error && (
        <div style={{
          backgroundColor: '#FCE8E6',
          color: 'var(--red-accent)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          marginBottom: '2rem',
          border: '1px solid #FAD2CF',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>Unable to reach your local AI model.</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-accent)', fontWeight: 600 }}>✕</button>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#D32F2F' }}>
            Ollama isn't responding right now.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button onClick={() => { setError(''); fetchDashboardData(); }} style={{
              backgroundColor: 'var(--red-accent)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 500
            }}>
              Retry
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Ollama · Local kernel
            </span>
          </div>
        </div>
      )}

      {/* 1. Header (Editorial Date) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ 
          fontSize: '0.7rem', 
          fontWeight: 600, 
          letterSpacing: '0.08em', 
          color: 'var(--text-secondary)', 
          textTransform: 'uppercase', 
          marginBottom: '0.25rem' 
        }}>
          {formattedDate}
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Good morning, {user?.full_name?.split(' ')[0] || 'Aryan'}.
        </h1>
      </div>

      {/* Proactive Reminder (Subtle/Quiet Notification) */}
      {proactiveReminder && (
        <div style={{
          marginBottom: '2.5rem',
          border: '1px dashed var(--purple-accent)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--warm-bg)',
          padding: '1rem 1.25rem',
        }}>
          <h4 style={{ 
            fontSize: '0.7rem', 
            fontWeight: 600, 
            letterSpacing: '0.05em',
            color: 'var(--purple-accent)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.375rem', 
            textTransform: 'uppercase', 
            marginBottom: '0.25rem' 
          }}>
            <Sparkles size={11} /> Attention Needed
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.4', margin: 0 }}>
            {proactiveReminder}
          </p>
        </div>
      )}

      {/* 2. Ask Noted - Unified Hero Command Box */}
      <div style={{ marginBottom: '3.5rem' }}>
        <form onSubmit={handleAskNoted} style={{ position: 'relative', width: '100%' }}>
          <input 
            type="text" 
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Ask or search your memory..." 
            style={{
              width: '100%',
              padding: '1.1rem 3.5rem 1.1rem 1.25rem',
              fontSize: '1.05rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)',
              transition: 'var(--transition)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--text-secondary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button 
            type="submit" 
            disabled={chatLoading} 
            style={{ 
              position: 'absolute', 
              right: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              transition: 'var(--transition)'
            }}
          >
            <Send size={18} />
          </button>
        </form>
        
        {/* Helper Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0 0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Search your memories, commitments, people, or notes:</span>
            <button onClick={() => setChatQuery("What is due this week?")} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--purple-accent)', textDecoration: 'underline', padding: 0 }}>
              "What's due this week?"
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>·</span>
            <button onClick={() => setChatQuery("What did I discuss with Rahul?")} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--purple-accent)', textDecoration: 'underline', padding: 0 }}>
              "What did I discuss with Rahul?"
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            ⌘ K Command palette
          </span>
        </div>

        {/* Dynamic Thinking States */}
        {chatLoading && (
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '40px', height: '40px' }}>
              <Lottie src={loaderAnimation.default || loaderAnimation} loop={true} autoplay={true} />
            </div>
            <span style={{ fontSize: '0.85rem' }}>{loadingStatus}</span>
          </div>
        )}

        {/* AI Answer Response */}
        {chatResponse && (
          <div style={{ 
            marginTop: '1.5rem',
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '1.5rem'
          }}>
            <div style={{ fontSize: '0.925rem', lineHeight: '1.6', color: 'var(--text-primary)' }} className="markdown-content">
              <ReactMarkdown>{chatResponse}</ReactMarkdown>
            </div>

            {citations.length > 0 && (
              <div style={{ 
                marginTop: '1rem', 
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>References:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                  {citations.map((cite, idx) => (
                    <span key={idx} className="badge">
                      📝 {cite.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Dashboard Data (Flat 3-column layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
        
        {/* Column 1: Today Stats */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{recentTasks.length}</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>commitments</span>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{notesCount}</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>memories</span>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Memories */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            Recent
          </h3>
          {recentNotes.length === 0 ? (
            <div style={{ padding: '0.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', marginBottom: '0.5rem' }}>
                <Lottie src={emptyAnimation.default || emptyAnimation} loop={true} autoplay={true} />
              </div>
              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 0.15rem 0' }}>
                Your memory is quiet.
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Conversations, decisions and important context will appear here as Noted learns what matters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentNotes.map((note, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {note.title || 'Untitled Note'}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.summary || note.content.substring(0, 50) + '...'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Up Next */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            Up Next
          </h3>
          {recentTasks.length === 0 ? (
            <div style={{ padding: '0.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', marginBottom: '0.5rem' }}>
                <Lottie src={successAnimation.default || successAnimation} loop={false} autoplay={true} />
              </div>
              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 0.15rem 0' }}>
                Nothing scheduled
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                All commitments complete.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTasks.map((task, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--purple-accent)', fontWeight: 600, fontSize: '0.75rem', minWidth: '40px' }}>
                    {formatTaskDate(task.due_date)}
                  </span>
                  <span style={{ color: 'var(--text-primary)', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {task.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Keyboard-Driven Command Palette Overlay */}
      {showPalette && (
        <div className="command-palette-overlay" onClick={() => setShowPalette(false)}>
          <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              className="command-palette-search"
              placeholder="Search your memory..." 
              value={paletteQuery}
              onChange={(e) => {
                setPaletteQuery(e.target.value);
                setSelectedIndex(0);
              }}
              autoFocus
            />
            
            <div className="command-palette-list">
              <div className="command-palette-category">Recent memories, commitments, & contacts</div>
              {getFilteredPaletteItems().length === 0 ? (
                <div style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  No matches found for "{paletteQuery}"
                </div>
              ) : (
                getFilteredPaletteItems().map((item, idx) => (
                  <div 
                    key={item.id + '-' + item.type}
                    className={`command-palette-item ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={() => {
                      item.action();
                      setShowPalette(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span style={{ fontSize: '1.1rem' }}>
                      {item.type === 'note' ? '📝' : item.type === 'task' ? '✅' : '👤'}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                      <span className="command-palette-item-title">{item.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subtitle}
                      </span>
                    </div>
                    <span className="command-palette-item-badge">{item.type}</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="command-palette-footer">
              <span>↑↓ Navigate  ↵ Open</span>
              <div className="command-palette-shortcuts">
                <span>esc to close</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
