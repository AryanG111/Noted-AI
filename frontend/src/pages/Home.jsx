import React, { useState, useEffect } from 'react';
import { useAuth, API_URL, handleApiResponse } from '../context/AuthContext';
import { 
  Search, 
  Send, 
  FileText, 
  CheckSquare, 
  Sparkles, 
  RotateCw, 
  ArrowRight, 
  Zap, 
  Users, 
  Brain, 
  Plus, 
  Compass, 
  Lightbulb,
  Sun,
  Moon,
  History,
  Calendar,
  CheckCircle2,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LottieAnimation from '../components/LottieAnimation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [briefingTab, setBriefingTab] = useState('briefing'); // 'briefing' | 'flashback'
  const [briefingData, setBriefingData] = useState(() => {
    try {
      const cacheKey = `noted_daily_briefing_${user?.id || 'default'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      checkAndFetchBriefing();
    }
  }, [token]);

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
      // Fetch tasks, notes, and contacts concurrently in parallel (resolves in ~10-40ms)
      const [tasksRes, notesRes, contactsRes] = await Promise.allSettled([
        fetch(`${API_URL}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/notes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/contacts`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      // 1. Process tasks
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const data = await tasksRes.value.json();
        const pending = data.filter(t => t.status !== 'done');
        setPendingTasksCount(pending.length);
        setRecentTasks(pending.slice(0, 3));
      }

      // 2. Process notes
      if (notesRes.status === 'fulfilled' && notesRes.value.ok) {
        const notes = await notesRes.value.json();
        setNotesCount(notes.length);
        setRecentNotes(notes.slice(0, 3));
      }

      // 3. Process contacts
      if (contactsRes.status === 'fulfilled' && contactsRes.value.ok) {
        const contacts = await contactsRes.value.json();
        setAllContacts(contacts);
      }
    } catch (e) {
      console.error("Error loading dashboard details:", e);
      setError(e.message || "Unable to connect to the backend server.");
    } finally {
      // KPIs and dashboard content render immediately without blocking on LLM
      setDashboardLoading(false);
    }
  };

  const checkAndFetchBriefing = () => {
    const cacheKey = `noted_daily_briefing_${user?.id || 'default'}`;
    let shouldFetch = true;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setBriefingData(parsed);
          const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
          const age = Date.now() - (parsed.cachedAt || 0);
          if (age < TWO_HOURS_MS) {
            shouldFetch = false; // Still fresh in localStorage
          }
        }
      } catch (e) {
        console.warn("Failed to parse cached briefing", e);
      }
    }

    if (shouldFetch) {
      fetchBriefing(false);
    }
  };

  const fetchBriefing = async (forceRefresh = false) => {
    setRefreshingBriefing(true);
    const cacheKey = `noted_daily_briefing_${user?.id || 'default'}`;
    try {
      const res = await fetch(`${API_URL}/search/briefing?force_refresh=${forceRefresh}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        data.cachedAt = Date.now();
        setBriefingData(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Unable to fetch briefing:", err);
    } finally {
      setRefreshingBriefing(false);
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
      
      const rawAnswer = data.answer || '';
      let cleanAnswer = rawAnswer.replace(/<thought>[\s\S]*?<\/thought>/gi, '').replace(/<think>[\s\S]*?<\/think>/gi, '');
      if (!cleanAnswer.trim()) {
        cleanAnswer = rawAnswer.replace(/<\/?(?:thought|think)>/gi, '');
        const lines = cleanAnswer.trim().split('\n');
        const valid = [];
        let started = false;
        for (const line of lines) {
          const l = line.trim();
          if (!started) {
            if (l.startsWith('*') || l.startsWith('-') || l.startsWith('#') || l.startsWith('>') || /^(hello|hi|here|i can|i am|welcome|as noted|noted ai|sure|certainly)/i.test(l)) {
              started = true;
              valid.push(line);
            }
            continue;
          }
          valid.push(line);
        }
        cleanAnswer = (valid.length > 0 ? valid.join('\n') : cleanAnswer).trim();
      }
      setChatResponse(cleanAnswer.trim());
      setCitations(data.citations || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "There's something wrong on our side. Please try again in a moment.");
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
    <div className="dashboard-page-container" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      
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
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-accent)', fontWeight: 600 }}>✕</button>
        </div>
      )}

      {/* 1. Header (Clean Editorial Greeting + New Note Action) */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Good morning, {user?.full_name?.split(' ')[0] || 'Aryan'}.
          </h1>
        </div>

        <button
          onClick={() => navigate('/notes')}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 500
          }}
        >
          <Plus size={15} /> New Note
        </button>
      </div>

      {/* 2. Clean, Minimal KPI Cards (Monochrome / Neutral Aesthetic) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2.25rem'
      }}>
        <div 
          onClick={() => navigate('/notes')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          className="note-mention-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</span>
            <FileText size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          {dashboardLoading ? (
            <div>
              <div className="skeleton-box" style={{ width: '32px', height: '28px', marginTop: '0.2rem' }} />
              <div className="skeleton-box" style={{ width: '80px', height: '12px', marginTop: '0.4rem' }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {notesCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {notesCount === 1 ? '1 saved note' : `${notesCount} saved notes`}
              </div>
            </>
          )}
        </div>

        <div 
          onClick={() => navigate('/tasks')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          className="note-mention-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks</span>
            <CheckSquare size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          {dashboardLoading ? (
            <div>
              <div className="skeleton-box" style={{ width: '32px', height: '28px', marginTop: '0.2rem' }} />
              <div className="skeleton-box" style={{ width: '85px', height: '12px', marginTop: '0.4rem' }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {pendingTasksCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {pendingTasksCount === 1 ? '1 pending task' : `${pendingTasksCount} pending tasks`}
              </div>
            </>
          )}
        </div>

        <div 
          onClick={() => navigate('/contacts')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          className="note-mention-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacts</span>
            <Users size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          {dashboardLoading ? (
            <div>
              <div className="skeleton-box" style={{ width: '32px', height: '28px', marginTop: '0.2rem' }} />
              <div className="skeleton-box" style={{ width: '95px', height: '12px', marginTop: '0.4rem' }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {allContacts.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {allContacts.length === 1 ? '1 person tracked' : `${allContacts.length} people tracked`}
              </div>
            </>
          )}
        </div>

        <div 
          onClick={() => navigate('/graph')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          className="note-mention-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Graph</span>
            <Compass size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            View Connections <ArrowRight size={13} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Interactive memory map
          </div>
        </div>
      </div>

      {/* 2.5. Interactive Daily Cognitive Briefing & Memory Flashback */}
      <div style={{
        marginBottom: '2.5rem',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: '#FFFFFF',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        position: 'relative'
      }}>
        {/* Top Header: Tabs & Refresh */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.85rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setBriefingTab('briefing')}
              style={{
                background: briefingTab === 'briefing' ? 'var(--text-primary)' : 'var(--warm-bg)',
                color: briefingTab === 'briefing' ? '#FFFFFF' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '100px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'var(--transition)'
              }}
            >
              {new Date().getHours() < 17 ? <Sun size={13} /> : <Moon size={13} />}
              <span>{new Date().getHours() < 17 ? 'Daily Briefing' : 'Evening Reflection'}</span>
            </button>

            <button
              onClick={() => setBriefingTab('flashback')}
              style={{
                background: briefingTab === 'flashback' ? 'var(--text-primary)' : 'var(--warm-bg)',
                color: briefingTab === 'flashback' ? '#FFFFFF' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '100px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'var(--transition)'
              }}
            >
              <History size={13} />
              <span>Memory Flashback</span>
              {briefingData?.flashback && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--purple-accent)',
                  marginLeft: '2px'
                }} />
              )}
            </button>
          </div>

          {/* Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => fetchBriefing(true)}
              disabled={refreshingBriefing}
              title="Refresh briefing with AI"
              style={{
                background: 'none',
                border: 'none',
                cursor: refreshingBriefing ? 'not-allowed' : 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                padding: '0.2rem 0.45rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <RotateCw size={12} className={refreshingBriefing ? 'spinner' : ''} />
              <span>{refreshingBriefing ? 'Synthesizing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Daily Briefing Content */}
        {briefingTab === 'briefing' && (
          <div>
            {/* Headline & Executive Summary */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '0.3rem'
              }}>
                <Sparkles size={14} style={{ color: 'var(--purple-accent)' }} />
                <span>{briefingData?.headline || "Your Daily Overview"}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                {briefingData?.focus_summary || "Scanning your memory base for active commitments and people to reconnect with."}
              </p>
            </div>

            {/* Top Priorities Action Items */}
            {briefingData?.priorities && briefingData.priorities.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.06em', 
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem' 
                }}>
                  Key Action Items
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                  {briefingData.priorities.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => navigate('/tasks')}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--warm-bg)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      className="note-mention-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <CheckSquare size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 500, 
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {task.description}
                        </span>
                      </div>
                      <ArrowRight size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '0.25rem' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reconnect Nudge */}
            {briefingData?.reconnect_nudge && (
              <div style={{
                backgroundColor: 'rgba(237, 233, 254, 0.4)',
                border: '1px solid #DDD6FE',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Users size={15} style={{ color: 'var(--purple-accent)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Follow up with {briefingData.reconnect_nudge.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                      ({briefingData.reconnect_nudge.days_stale} days since last interaction)
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {briefingData.reconnect_nudge.context}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/contacts')}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #C4B5FD',
                    color: 'var(--purple-accent)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View Contact
                </button>
              </div>
            )}

            {/* Spark Thought */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              fontSize: '0.78rem', 
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              borderTop: '1px dashed var(--border-color)',
              paddingTop: '0.65rem'
            }}>
              <Lightbulb size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span>{briefingData?.spark_thought || "What is the single most important outcome that would make today a success?"}</span>
            </div>
          </div>
        )}

        {/* Tab 2: Memory Flashback Content */}
        {briefingTab === 'flashback' && (
          <div>
            {briefingData?.flashback ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--purple-accent)', marginBottom: '0.2rem' }}>
                      🕰️ Memory from {briefingData.flashback.days_ago} days ago
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {briefingData.flashback.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => navigate('/notes', { state: { selectedNoteId: briefingData.flashback.id } })}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    Open in Notes <ExternalLink size={12} />
                  </button>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--warm-bg)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  margin: '0.75rem 0'
                }}>
                  "{briefingData.flashback.excerpt}"
                </p>

                {briefingData.flashback.tags && briefingData.flashback.tags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {briefingData.flashback.tags.map((tag, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-color)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '100px'
                      }}>
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                <History size={20} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5, display: 'block' }} />
                <span>As your second brain grows, past memories, ideas, and decisions from previous weeks will resurface here.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Search & Ask Memory (Sleek Clean Styling with Hover Suggestions) */}
      <div className="search-section-container" style={{ marginBottom: '2.75rem' }}>
        <form onSubmit={handleAskNoted} style={{ position: 'relative', width: '100%' }}>
          <input 
            type="text" 
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Search notes or ask a question..." 
            style={{
              width: '100%',
              padding: '1.05rem 3.5rem 1.05rem 1.25rem',
              fontSize: '0.975rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              color: 'var(--text-primary)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'var(--transition)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--text-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button 
            type="submit" 
            disabled={chatLoading || !chatQuery.trim()} 
            style={{ 
              position: 'absolute', 
              right: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              background: chatQuery.trim() ? 'var(--text-primary)' : 'none', 
              border: 'none', 
              borderRadius: 'var(--radius-sm)',
              cursor: chatQuery.trim() ? 'pointer' : 'default',
              color: chatQuery.trim() ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              transition: 'var(--transition)'
            }}
          >
            <Send size={15} />
          </button>
        </form>
        
        {/* Helper suggestions visible on Hover or Focus */}
        <div className="search-suggestions-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', padding: '0 0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Suggestions:</span>
            <button 
              type="button"
              onClick={() => setChatQuery("What is due this week?")} 
              className="suggestion-pill"
            >
              "What's due this week?"
            </button>
            <button 
              type="button"
              onClick={() => setChatQuery("What notes mention meetings?")} 
              className="suggestion-pill"
            >
              "Meeting notes"
            </button>
          </div>

          <button 
            type="button"
            onClick={() => { setShowPalette(true); setPaletteQuery(''); setSelectedIndex(0); }}
            style={{ 
              background: 'none', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', 
              fontSize: '0.72rem', 
              color: 'var(--text-secondary)', 
              fontWeight: 500,
              padding: '0.2rem 0.5rem'
            }}
          >
            ⌘ K Quick search
          </button>
        </div>

        {/* Dynamic Thinking States */}
        {chatLoading && (
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '40px', height: '40px' }}>
              <LottieAnimation animationData={loaderAnimation} loop={true} autoplay={true} />
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatResponse}</ReactMarkdown>
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
      <div className="dashboard-stats-grid">
        
        {/* Column 1: Today Stats */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            Today
          </h3>
          {dashboardLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="skeleton-box" style={{ width: '110px', height: '18px' }} />
              <div className="skeleton-box" style={{ width: '95px', height: '18px' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{pendingTasksCount}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>commitments</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{notesCount}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>memories</span>
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Recent Memories */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            Recent
          </h3>
          {dashboardLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <div className="skeleton-box" style={{ width: '70%', height: '14px', marginBottom: '0.35rem' }} />
                <div className="skeleton-box" style={{ width: '90%', height: '11px' }} />
              </div>
              <div>
                <div className="skeleton-box" style={{ width: '60%', height: '14px', marginBottom: '0.35rem' }} />
                <div className="skeleton-box" style={{ width: '80%', height: '11px' }} />
              </div>
            </div>
          ) : recentNotes.length === 0 ? (
            <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '85px', height: '85px', marginBottom: '0.35rem' }}>
                <LottieAnimation animationData={emptyAnimation} loop={true} autoplay={true} />
              </div>
              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 0.15rem 0' }}>
                No recent notes
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Your saved thoughts and summaries will appear here.
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
          {dashboardLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="skeleton-box" style={{ width: '85%', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '75%', height: '14px' }} />
            </div>
          ) : recentTasks.length === 0 ? (
            <div style={{ padding: '0.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', marginBottom: '0.5rem' }}>
                <LottieAnimation animationData={successAnimation} loop={true} autoplay={true} />
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
