import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { EmptyTasksDoodle } from '../components/DoodleIllustrations';
import { CheckSquare, Trash2, Calendar, Square, Plus } from 'lucide-react';

export const Tasks = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch tasks (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message || "Connection error to server");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        fetchTasks();
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to update task status (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      setError(error.message || "Connection error to server");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchTasks();
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to delete task (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error.message || "Connection error to server");
    }
  };

  const handleCreateManualTask = async (e) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: newTaskDesc.trim(), status: 'pending' })
      });
      if (response.ok) {
        setNewTaskDesc('');
        fetchTasks();
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to create task (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error creating manual task:', error);
      setError(error.message || "Connection error to server");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        Loading commitments...
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
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
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Action Items
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Monitor automatically extracted tasks and checklists in one place.
        </p>
      </div>

      {/* Manual Task Add Bar */}
      <form onSubmit={handleCreateManualTask} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Add a new task manually..." 
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
          style={{
            flexGrow: 1,
            padding: '0.75rem 1rem',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </form>

      {tasks.length === 0 ? (
        <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--warm-bg)' }}>
          <EmptyTasksDoodle />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Pending Tasks */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="doodle-text" style={{ color: 'var(--text-primary)' }}>Unresolved Commitments</span>
              <span className="badge" style={{ backgroundColor: '#F3F4F6' }}>{pendingTasks.length}</span>
            </h3>
            {pendingTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                All commitments resolved!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingTasks.map(task => (
                  <div key={task.id} className="card" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    transition: 'var(--transition)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <button 
                        onClick={() => handleToggleStatus(task)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: 0
                        }}
                      >
                        <Square size={18} />
                      </button>
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {task.description}
                        </span>
                        {task.due_date && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem', 
                            fontSize: '0.75rem', 
                            color: 'var(--red-accent)',
                            marginTop: '0.25rem'
                          }}>
                            <Calendar size={10} />
                            <span>Due {formatDate(task.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                Completed
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.65 }}>
                {completedTasks.map(task => (
                  <div key={task.id} className="card" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    backgroundColor: 'var(--warm-bg)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button 
                        onClick={() => handleToggleStatus(task)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--green-accent)',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: 0
                        }}
                      >
                        <CheckSquare size={18} />
                      </button>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--text-secondary)', 
                        textDecoration: 'line-through' 
                      }}>
                        {task.description}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
