import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { SparkleDoodle } from '../components/DoodleIllustrations';
import { Plus, Trash2, Calendar, User, Check, CheckSquare, ArrowLeft, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import LottieAnimation from '../components/LottieAnimation';
import loaderAnimation from '../assets/loader.json';
import emptyAnimation from '../assets/empty.json';

export const Notes = () => {
  const { token, activeKernel } = useAuth();
  const location = useLocation();
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [savingStatus, setSavingStatus] = useState(''); // 'Saving...', 'Remembered', or ''
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'editor' | 'insights'
  
  const saveTimeoutRef = useRef(null);

  // Fetch all notes on startup or when target note passed from navigation
  useEffect(() => {
    const targetId = location.state?.selectedNoteId || new URLSearchParams(location.search).get('id');
    fetchNotes(targetId);
  }, [location.state?.selectedNoteId, location.search]);

  const latestTitleRef = useRef('');
  const latestContentRef = useRef('');

  // Keep refs up to date
  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  // Polling mechanism for background processing
  useEffect(() => {
    if (!selectedNote || !selectedNote.is_processing) {
      setProcessing(false);
      return;
    }

    setProcessing(true);
    
    // Set up polling interval
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/notes/${selectedNote.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const noteData = await response.json();
          if (!noteData.is_processing) {
            // Processing complete! Keep currently typed text in editor so we don't wipe it
            setSelectedNote(prev => ({
              ...noteData,
              title: latestTitleRef.current || noteData.title,
              content: latestContentRef.current || noteData.content
            }));
            setProcessing(false);
            clearInterval(interval);
            
            // Refresh note list in sidebar
            const listResponse = await fetch(`${API_URL}/notes`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (listResponse.ok) {
              const listData = await listResponse.json();
              setNotes(listData);
            }
          }
        }
      } catch (err) {
        console.error("Error polling note processing state:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedNote?.id, selectedNote?.is_processing]);

  const fetchNotes = async (selectId = null) => {
    try {
      const response = await fetch(`${API_URL}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
        if (data.length > 0) {
          if (selectId) {
            const found = data.find(n => n.id === selectId);
            if (found) handleSelectNote(found);
          } else if (!selectedNote) {
            handleSelectNote(data[0]);
          }
        } else {
          setSelectedNote(null);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch notes (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError(error.message || "Connection error to server");
    }
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setTitle(note.title || '');
    setContent(note.content || '');
    latestTitleRef.current = note.title || '';
    latestContentRef.current = note.content || '';
    setSavingStatus('');
    setMobileView('editor');
  };

  const createNewNote = async () => {
    setCreating(true);
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Active-Kernel': activeKernel
        },
        body: JSON.stringify({ title: 'Untitled Note', content: 'Start writing...' })
      });
      if (response.ok) {
        const newNote = await response.json();
        await fetchNotes(newNote.id);
        setMobileView('editor');
        if (newNote.error) {
          setError(newNote.error);
          setProcessing(false);
        } else {
          setError('');
          if (!newNote.is_processing) {
            setProcessing(false);
          }
        }
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to create note (HTTP ${response.status})`);
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error creating note:', error);
      setError(error.message || "Connection error to server");
      setProcessing(false);
    } finally {
      setCreating(false);
    }
  };

  const deleteNote = async (id, e) => {
    e.stopPropagation();
    if (deletingId) return;
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setTitle('');
          setContent('');
          latestTitleRef.current = '';
          latestContentRef.current = '';
        }
        await fetchNotes();
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to delete note (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setError(error.message || "Connection error to server");
    } finally {
      setDeletingId(null);
    }
  };

  // Trigger auto-save debounce
  const triggerAutoSave = (newTitle, newContent) => {
    setSavingStatus('Saving...');
    setProcessing(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!selectedNote) return;
      try {
        const response = await fetch(`${API_URL}/notes/${selectedNote.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Active-Kernel': activeKernel
          },
          body: JSON.stringify({ title: newTitle, content: newContent })
        });
        if (response.ok) {
          const updated = await response.json();
          // Update selected note with pipeline results, preserving newer keystrokes
          setSelectedNote(prev => ({
            ...updated,
            title: latestTitleRef.current,
            content: latestContentRef.current
          }));
          if (updated.error) {
            setError(updated.error);
            setSavingStatus('Saved (Ingestion Error)');
            setProcessing(false);
          } else {
            setError('');
            setSavingStatus('Remembered!');
            if (!updated.is_processing) {
              setProcessing(false);
            }
          }
          // Refresh note list in background
          const listResponse = await fetch(`${API_URL}/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (listResponse.ok) {
            const listData = await listResponse.json();
            setNotes(listData);
          }
        } else {
          const err = await response.json().catch(() => ({}));
          setError(err.detail || `Auto-save failed (HTTP ${response.status})`);
          setSavingStatus('Error saving');
          setProcessing(false);
        }
      } catch (error) {
        console.error('Error auto-saving note:', error);
        setError(error.message || "Connection error during auto-save");
        setSavingStatus('Error saving');
        setProcessing(false);
      } finally {
        // Clear status text after 2 seconds
        setTimeout(() => setSavingStatus(prev => prev === 'Remembered!' ? '' : prev), 2000);
      }
    }, 1500); // 1.5 seconds delay
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    latestTitleRef.current = val;
    triggerAutoSave(val, latestContentRef.current);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    latestContentRef.current = val;
    triggerAutoSave(latestTitleRef.current, val);
  };

  return (
    <div className="notes-container">
      {/* 1. Left List Panel */}
      <div className={`notes-list-panel ${mobileView !== 'list' ? 'hide-on-mobile' : ''}`}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={createNewNote}
            disabled={creating}
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              opacity: creating ? 0.7 : 1, 
              cursor: creating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {creating ? (
              <>
                <span style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.6s linear infinite',
                  marginRight: '0.5rem'
                }} />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>New Note</span>
              </>
            )}
          </button>
        </div>
        
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {notes.length === 0 ? (
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              fontSize: '0.85rem', 
              marginTop: '2rem' 
            }}>
              No notes yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notes.map(n => (
                <div 
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: selectedNote?.id === n.id ? '#D1D5DB' : 'transparent',
                    backgroundColor: selectedNote?.id === n.id ? '#FFFFFF' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'var(--transition)'
                  }}
                  className="note-list-item"
                >
                  <div style={{ overflow: 'hidden', marginRight: '0.5rem' }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {n.title || 'Untitled Note'}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '0.125rem'
                    }}>
                      {n.content ? n.content.substring(0, 30) : 'Start writing...'}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteNote(n.id, e)}
                    disabled={deletingId !== null}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: deletingId === n.id ? 'var(--red-accent)' : 'var(--text-secondary)',
                      cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                      opacity: selectedNote?.id === n.id || deletingId === n.id ? 1 : 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    className="delete-btn"
                  >
                    {deletingId === n.id ? (
                      <span className="spinner" style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid var(--red-accent)',
                        borderTopColor: 'transparent'
                      }} />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Writing Canvas */}
      <div className={`notes-editor-panel ${mobileView !== 'editor' ? 'hide-on-mobile' : ''}`}>
        {selectedNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            {/* Mobile Navigation Header */}
            <div className="show-on-mobile hide-on-desktop" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--warm-bg)'
            }}>
              <button 
                onClick={() => setMobileView('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}
              >
                <ArrowLeft size={16} /> All Notes
              </button>
              
              <button 
                onClick={() => setMobileView('insights')}
                style={{
                  background: '#EDE9FE',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '0.25rem 0.65rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  color: 'var(--purple-accent)',
                  fontWeight: 600
                }}
              >
                <Sparkles size={13} /> AI Insights
              </button>
            </div>
            {/* Header / Save Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 2rem',
              borderBottom: '1px solid var(--border-color)',
              flexShrink: 0
            }}>
              <span className="doodle-text" style={{ fontSize: '0.85rem', color: 'var(--purple-accent)' }}>
                {savingStatus && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {savingStatus}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Auto-saves as you type
              </span>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#FCE8E6',
                color: 'var(--red-accent)',
                padding: '0.5rem 2rem',
                fontSize: '0.85rem',
                borderBottom: '1px solid #FAD2CF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <span>{error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-accent)', fontWeight: 600 }}>✕</button>
              </div>
            )}

            {/* Note Fields */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '2rem', overflowY: 'auto' }}>
              <input 
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Title your memory..."
                style={{
                  width: '100%',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  border: 'none',
                  outline: 'none',
                  marginBottom: '1rem',
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing your thoughts..."
                style={{
                  width: '100%',
                  flexGrow: 1,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '1.05rem',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: 'var(--warm-bg)'
          }}>
            <div style={{ width: '150px', height: '150px', marginBottom: '0.5rem' }}>
              <LottieAnimation animationData={emptyAnimation} loop={true} autoplay={true} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Select a note or create a new one to begin.</p>
          </div>
        )}
      </div>

      {/* 3. AI Cognitive Panel */}
      {selectedNote && (
        <div className={`notes-ai-panel ${mobileView !== 'insights' ? 'hide-on-mobile' : ''}`}>
          {/* Mobile Back Button */}
          <div className="show-on-mobile hide-on-desktop" style={{ marginBottom: '1rem' }}>
            <button 
              onClick={() => setMobileView('editor')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back to Editor
            </button>
          </div>
          {processing ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '1rem'
            }}>
              <div style={{ width: '80px', height: '80px' }}>
                <LottieAnimation animationData={loaderAnimation} loop={true} autoplay={true} />
              </div>
              <p className="doodle-text" style={{ fontSize: '1.15rem' }}>✦ Remembering this...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <SparkleDoodle size={16} style={{ color: 'var(--purple-accent)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Noted Cognitive Insights</h3>
              </div>

              {/* Summary */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Summary</h4>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.4', color: 'var(--text-primary)' }}>
                  {selectedNote.summary || "No summary generated yet. Type to begin processing."}
                </p>
              </div>

              {/* Tags */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tags</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {selectedNote.tags ? selectedNote.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="badge" style={{ backgroundColor: '#EDE9FE', color: 'var(--purple-accent)' }}>
                      #{tag}
                    </span>
                  )) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tags yet</span>
                  )}
                </div>
              </div>

              {/* Extracted Tasks (will be fully integrated in Phase 3) */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tasks Found</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Note: Extracted tasks will be dynamically loaded from database in Phase 3.
                      For now, we query them locally if selectedNote matches or show a helper. */}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Tasks extracted automatically from text will populate your Task list.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
