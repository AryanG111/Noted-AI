import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { EmptyContactsDoodle } from '../components/DoodleIllustrations';
import { User, FileText, CheckSquare, Edit3, Save, Trash2 } from 'lucide-react';

export const Contacts = () => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [memories, setMemories] = useState({ notes: [], tasks: [] });
  const [role, setRole] = useState('');
  const [context, setContext] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async (selectId = null) => {
    try {
      const response = await fetch(`${API_URL}/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
        if (data.length > 0) {
          if (selectId) {
            const found = data.find(c => c.id === selectId);
            if (found) handleSelectContact(found);
          } else if (!selectedContact) {
            handleSelectContact(data[0]);
          }
        }
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch contacts (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError(error.message || "Connection error to server");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = async (contact) => {
    setSelectedContact(contact);
    setRole(contact.role || '');
    setContext(contact.context || '');
    setIsEditing(false);
    
    // Fetch associated memories via graph relations
    try {
      const response = await fetch(`${API_URL}/contacts/${contact.id}/memories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMemories({
          notes: data.notes || [],
          tasks: data.tasks || []
        });
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch contact memories (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching contact memories:', error);
      setError(error.message || "Connection error to server");
    }
  };

  const saveContactUpdates = async () => {
    if (!selectedContact) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role, context })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedContact(updated);
        setIsEditing(false);
        // Refresh contact list in sidebar
        await fetchContacts(updated.id);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to update contact (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      setError(error.message || "Connection error to server");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    if (deleting) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedContact.name}?`)) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/contacts/${selectedContact.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSelectedContact(null);
        // Refresh contact list in sidebar
        const remaining = contacts.filter(c => c.id !== selectedContact.id);
        setContacts(remaining);
        if (remaining.length > 0) {
          handleSelectContact(remaining[0]);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to delete contact (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      setError(error.message || "Connection error to server");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        Retrieving contact profiles...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* 1. Left Sidebar List */}
      <div style={{
        width: '260px',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--warm-bg)',
        flexShrink: 0
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Memory Profiles</h2>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {contacts.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2rem' }}>
              No contacts saved yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {contacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectContact(c)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: selectedContact?.id === c.id ? '#D1D5DB' : 'transparent',
                    backgroundColor: selectedContact?.id === c.id ? '#FFFFFF' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#E8F0FE',
                    color: 'var(--blue-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={16} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.role || 'Contact'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Center Contact Profile Detail */}
      <div style={{ flexGrow: 1, backgroundColor: '#FFFFFF', padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
            alignItems: 'center',
            maxWidth: '800px',
            width: '100%'
          }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-accent)', fontWeight: 600 }}>✕</button>
          </div>
        )}
        {selectedContact ? (
          <div style={{ maxWidth: '800px', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#E8F0FE',
                  color: 'var(--blue-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={28} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {selectedContact.name}
                  </h1>
                  {isEditing ? (
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Founder, Architect"
                      style={{
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        marginTop: '0.25rem'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {selectedContact.role || 'No role assigned'}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isEditing ? (
                  <button 
                    onClick={saveContactUpdates} 
                    disabled={saving || deleting} 
                    className="btn btn-primary" 
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {saving ? (
                      <span className="spinner" style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        marginRight: '0.25rem'
                      }} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)} 
                      disabled={deleting} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      <Edit3 size={14} />
                      <span>Edit Profile</span>
                    </button>
                    <button 
                      onClick={handleDeleteContact} 
                      disabled={deleting} 
                      className="btn" 
                      style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: 'var(--red-accent)', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {deleting ? (
                        <span className="spinner" style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid white',
                          borderTopColor: 'transparent',
                          marginRight: '0.25rem'
                        }} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="card" style={{ marginBottom: '2.5rem', backgroundColor: 'var(--warm-bg)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Evolving Memory Context</h3>
              {isEditing ? (
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  style={{
                    width: '100%',
                    height: '140px',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem'
                  }}
                />
              ) : (
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {selectedContact.context || "No context extracted yet. Mention this person in note writing to aggregate profile details automatically."}
                </p>
              )}
            </div>

            {/* Linked Notes & Tasks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Note mentions */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} style={{ color: 'var(--purple-accent)' }} />
                  <span>Mentioned In</span>
                </h3>
                {memories.notes.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No note references found</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {memories.notes.map(note => (
                      <div key={note.id} className="card" style={{ padding: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{note.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{note.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Associated Tasks */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckSquare size={16} style={{ color: 'var(--green-accent)' }} />
                  <span>Assigned / Associated Tasks</span>
                </h3>
                {memories.tasks.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No task references found</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {memories.tasks.map(task => (
                      <div key={task.id} className="card" style={{ 
                        padding: '1rem', 
                        borderColor: task.status === 'done' ? 'var(--border-color)' : '#A7F3D0',
                        opacity: task.status === 'done' ? 0.7 : 1
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            checked={task.status === 'done'} 
                            readOnly 
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ 
                            fontSize: '0.875rem', 
                            textDecoration: task.status === 'done' ? 'line-through' : 'none' 
                          }}>
                            {task.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--warm-bg)', borderRadius: 'var(--radius-lg)' }}>
            <EmptyContactsDoodle />
          </div>
        )}
      </div>
    </div>
  );
};
