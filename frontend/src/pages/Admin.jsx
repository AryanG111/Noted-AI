import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { ShieldCheck, UserX, Check, Trash2, Search, RefreshCw, UserCheck, Clock, AlertCircle } from 'lucide-react';

export const Admin = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to load users');
      }
    } catch (e) {
      setError(e.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    setUpdatingId(userId);
    setError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? updated : u));
        setActionSuccess(`User '${updated.email}' has been set to ${newStatus}.`);
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to update user status');
      }
    } catch (e) {
      setError(e.message || 'Connection error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to permanently delete user '${email}' and all of their notes, tasks, and data?`)) {
      return;
    }
    setUpdatingId(userId);
    setError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setActionSuccess(`User '${email}' and all associated data deleted.`);
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to delete user');
      }
    } catch (e) {
      setError(e.message || 'Connection error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.email || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
      (u.occupation || '').toLowerCase().includes(filterQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && u.status === statusFilter;
  });

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      fontFamily: 'var(--font-sans)',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={24} style={{ color: 'var(--purple-accent)' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>User Management</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Approve or reject registration requests and manage user accounts.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          backgroundColor: '#FCE8E6',
          color: 'var(--red-accent)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div style={{
          backgroundColor: '#E6F4EA',
          color: '#137333',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          backgroundColor: '#FFFFFF',
          flexGrow: 1,
          maxWidth: '360px'
        }}>
          <Search size={16} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              width: '100%',
              backgroundColor: 'transparent'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: statusFilter === 'all' ? 'var(--text-primary)' : 'var(--border-color)',
              backgroundColor: statusFilter === 'all' ? 'var(--text-primary)' : '#FFFFFF',
              color: statusFilter === 'all' ? '#FFFFFF' : 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: statusFilter === 'pending' ? 'var(--purple-accent)' : 'var(--border-color)',
              backgroundColor: statusFilter === 'pending' ? 'var(--purple-accent)' : '#FFFFFF',
              color: statusFilter === 'pending' ? '#FFFFFF' : 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Pending
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: statusFilter === 'pending' ? '#FFFFFF' : '#FEF3C7',
                color: statusFilter === 'pending' ? 'var(--purple-accent)' : '#D97706',
                borderRadius: '100px',
                padding: '0.1rem 0.4rem',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: statusFilter === 'approved' ? '#059669' : 'var(--border-color)',
              backgroundColor: statusFilter === 'approved' ? '#059669' : '#FFFFFF',
              color: statusFilter === 'approved' ? '#FFFFFF' : 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: statusFilter === 'rejected' ? 'var(--red-accent)' : 'var(--border-color)',
              backgroundColor: statusFilter === 'rejected' ? 'var(--red-accent)' : '#FFFFFF',
              color: statusFilter === 'rejected' ? '#FFFFFF' : 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {loading && users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading accounts...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No accounts match the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Registered</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isCurrentAdmin = u.id === user?.id;
                  const isBusy = updatingId === u.id;
                  
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.full_name || 'Anonymous User'}
                          {isCurrentAdmin && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--purple-accent)', marginLeft: '0.4rem', fontWeight: 600 }}>
                              (You)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {u.email} • {u.occupation || 'No occupation'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '100px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: u.role === 'admin' ? '#EDE9FE' : '#F3F4F6',
                          color: u.role === 'admin' ? 'var(--purple-accent)' : 'var(--text-secondary)'
                        }}>
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 
                            u.status === 'approved' ? '#D1FAE5' :
                            u.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                          color:
                            u.status === 'approved' ? '#047857' :
                            u.status === 'pending' ? '#B45309' : '#B91C1C'
                        }}>
                          {u.status === 'approved' && <Check size={12} />}
                          {u.status === 'pending' && <Clock size={12} />}
                          {u.status === 'rejected' && <UserX size={12} />}
                          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                        </span>
                      </td>

                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {isCurrentAdmin ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Primary Admin
                          </span>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            {u.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'approved')}
                                disabled={isBusy}
                                title="Approve Registration"
                                style={{
                                  background: '#10B981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <UserCheck size={13} /> Approve
                              </button>
                            )}

                            {u.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'rejected')}
                                disabled={isBusy}
                                title="Reject Account"
                                style={{
                                  background: '#F59E0B',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <UserX size={13} /> Reject
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={isBusy}
                              title="Permanently Delete User"
                              style={{
                                background: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
