import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL, handleApiResponse } from '../context/AuthContext';
import { EmptyContactsDoodle } from '../components/DoodleIllustrations';
import { User, Users, Building, GraduationCap, FileText, CheckSquare, Edit3, Save, Trash2, ArrowLeft } from 'lucide-react';

export const Contacts = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [memories, setMemories] = useState({ notes: [], tasks: [] });
  const [role, setRole] = useState('');
  const [entityType, setEntityType] = useState('person');
  const [organization, setOrganization] = useState('');
  const [context, setContext] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'person' | 'team_org'
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mobileShowDetails, setMobileShowDetails] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async (selectId = null) => {
    try {
      const response = await fetch(`${API_URL}/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleApiResponse(response, 'Unable to load contacts.');
      setContacts(data || []);
      if (data && data.length > 0) {
        if (selectId) {
          const found = data.find(c => c.id === selectId);
          if (found) handleSelectContact(found);
        } else if (!selectedContact) {
          handleSelectContact(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = async (contact) => {
    setSelectedContact(contact);
    setRole(contact.role || '');
    setEntityType(contact.entity_type || 'person');
    setOrganization(contact.organization || '');
    setContext(contact.context || '');
    setIsEditing(false);
    setMobileShowDetails(true);
    
    // Fetch associated memories via graph relations
    try {
      const response = await fetch(`${API_URL}/contacts/${contact.id}/memories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await handleApiResponse(response, 'Unable to load contact memories.');
      setMemories({
        notes: data?.notes || [],
        tasks: data?.tasks || []
      });
    } catch (error) {
      console.error('Error fetching contact memories:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
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
        body: JSON.stringify({ 
          role, 
          entity_type: entityType, 
          organization, 
          context 
        })
      });
      const updated = await handleApiResponse(response, 'Unable to update contact.');
      setSelectedContact(updated);
      setIsEditing(false);
      // Refresh contact list in sidebar
      await fetchContacts(updated.id);
    } catch (error) {
      console.error('Error updating contact:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
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
      await handleApiResponse(response, 'Unable to delete contact.');
      setSelectedContact(null);
      // Refresh contact list in sidebar
      const remaining = contacts.filter(c => c.id !== selectedContact.id);
      setContacts(remaining);
      if (remaining.length > 0) {
        handleSelectContact(remaining[0]);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
    } finally {
      setDeleting(false);
    }
  };

  const getEntityIconAndStyle = (type) => {
    switch (type) {
      case 'team':
        return {
          icon: <Users size={16} />,
          bg: '#F3E8FF',
          color: '#9333EA',
          label: 'Team'
        };
      case 'organization':
        return {
          icon: <Building size={16} />,
          bg: '#FEF3C7',
          color: '#D97706',
          label: 'Organization'
        };
      case 'institution':
        return {
          icon: <GraduationCap size={16} />,
          bg: '#DCFCE7',
          color: '#16A34A',
          label: 'Institution'
        };
      default:
        return {
          icon: <User size={16} />,
          bg: '#E8F0FE',
          color: 'var(--blue-accent)',
          label: 'Person'
        };
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (filterType === 'person') return (c.entity_type || 'person') === 'person';
    if (filterType === 'team_org') return (c.entity_type || 'person') !== 'person';
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        Retrieving contact profiles...
      </div>
    );
  }

  const personCount = contacts.filter(c => (c.entity_type || 'person') === 'person').length;
  const teamOrgCount = contacts.filter(c => (c.entity_type || 'person') !== 'person').length;

  return (
    <div className="contacts-container">
      {/* 1. Left Sidebar List */}
      <div className={`contacts-list-panel ${mobileShowDetails ? 'hide-on-mobile' : ''}`}>
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem' }}>Memory Profiles</h2>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: filterType === 'all' ? 'var(--text-primary)' : 'var(--border-color)',
                backgroundColor: filterType === 'all' ? 'var(--text-primary)' : 'transparent',
                color: filterType === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              All ({contacts.length})
            </button>
            <button
              onClick={() => setFilterType('person')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: filterType === 'person' ? 'var(--blue-accent)' : 'var(--border-color)',
                backgroundColor: filterType === 'person' ? '#E8F0FE' : 'transparent',
                color: filterType === 'person' ? 'var(--blue-accent)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              People ({personCount})
            </button>
            <button
              onClick={() => setFilterType('team_org')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: filterType === 'team_org' ? '#9333EA' : 'var(--border-color)',
                backgroundColor: filterType === 'team_org' ? '#F3E8FF' : 'transparent',
                color: filterType === 'team_org' ? '#9333EA' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Teams & Orgs ({teamOrgCount})
            </button>
          </div>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {filteredContacts.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2rem' }}>
              {contacts.length === 0 ? 'No contacts saved yet.' : 'No profiles match this filter.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredContacts.map(c => {
                const styleInfo = getEntityIconAndStyle(c.entity_type || 'person');
                return (
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
                      backgroundColor: styleInfo.bg,
                      color: styleInfo.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {styleInfo.icon}
                    </div>
                    <div style={{ overflow: 'hidden', flexGrow: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </span>
                        {c.entity_type && c.entity_type !== 'person' && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '0.1rem 0.35rem', 
                            borderRadius: '4px', 
                            backgroundColor: styleInfo.bg, 
                            color: styleInfo.color, 
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {styleInfo.label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.role || (c.entity_type === 'team' ? 'Team' : 'Contact')}
                        {c.organization ? ` • ${c.organization}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Center Contact Profile Detail */}
      <div className={`contacts-details-panel ${!mobileShowDetails ? 'hide-on-mobile' : ''}`}>
        {/* Mobile Back Button */}
        <div className="show-on-mobile hide-on-desktop" style={{ marginBottom: '1rem' }}>
          <button 
            onClick={() => setMobileShowDetails(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back to Contacts
          </button>
        </div>
        {error && (
          <div style={{
            backgroundColor: '#FCE8E6',
            color: 'var(--red-accent)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
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
          <div style={{ maxWidth: '840px', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: getEntityIconAndStyle(selectedContact.entity_type || 'person').bg,
                  color: getEntityIconAndStyle(selectedContact.entity_type || 'person').color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {React.cloneElement(getEntityIconAndStyle(selectedContact.entity_type || 'person').icon, { size: 28 })}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {selectedContact.name}
                    </h1>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      backgroundColor: getEntityIconAndStyle(selectedContact.entity_type || 'person').bg,
                      color: getEntityIconAndStyle(selectedContact.entity_type || 'person').color,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {getEntityIconAndStyle(selectedContact.entity_type || 'person').label}
                    </span>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={entityType}
                          onChange={(e) => setEntityType(e.target.value)}
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.85rem',
                            background: '#FFFFFF'
                          }}
                        >
                          <option value="person">Person</option>
                          <option value="team">Team / Department</option>
                          <option value="organization">Organization / Company</option>
                          <option value="institution">School / College / Institution</option>
                        </select>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="Role / Function"
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Organization / Company / School (optional)"
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem',
                          maxWidth: '300px'
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {selectedContact.role || (selectedContact.entity_type === 'team' ? 'Team' : 'Contact')}
                      {selectedContact.organization ? ` • ${selectedContact.organization}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isEditing ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={saveContactUpdates} 
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    <Save size={14} />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setIsEditing(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleDeleteContact}
                      disabled={deleting}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--red-accent)', borderColor: '#FAD2CF' }}
                    >
                      <Trash2 size={14} />
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
            <div className="contacts-memories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
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
                      <div 
                        key={note.id} 
                        className="card note-mention-card" 
                        onClick={() => navigate('/notes', { state: { selectedNoteId: note.id } })}
                        style={{ 
                          padding: '1rem',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          backgroundColor: 'var(--surface-bg)'
                        }}
                        title="Click to open this note in the editor"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            {note.title || 'Untitled Note'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--purple-accent)', fontWeight: 500, flexShrink: 0, marginLeft: '0.5rem' }}>
                            Open Note →
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                          {note.summary || (note.content ? note.content.substring(0, 80) + '...' : 'Open note memory')}
                        </p>
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
