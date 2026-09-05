import React, { useState, useEffect } from 'react';
import { useAuth, API_URL, handleApiResponse } from '../context/AuthContext';
import { EmptyTasksDoodle } from '../components/DoodleIllustrations';
import { CheckSquare, Trash2, Calendar, Square, Plus, AlertTriangle, Clock, Filter, CheckCircle2 } from 'lucide-react';

export const Tasks = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'overdue' | 'active' | 'done'
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
      const data = await handleApiResponse(response, 'Unable to load tasks.');
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
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
      await handleApiResponse(response, 'Unable to update task status.');
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await handleApiResponse(response, 'Unable to delete task.');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
    }
  };

  const handleCreateManualTask = async (e) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;
    try {
      const payload = {
        description: newTaskDesc.trim(),
        status: 'pending'
      };
      if (newTaskDueDate) {
        payload.due_date = new Date(newTaskDueDate).toISOString();
      }

      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      await handleApiResponse(response, 'Unable to create task.');
      setNewTaskDesc('');
      setNewTaskDueDate('');
      fetchTasks();
    } catch (error) {
      console.error('Error creating manual task:', error);
      setError(error.message || "There's something wrong on our side. Please try again in a moment.");
    }
  };

  const isOverdue = (task) => {
    if (task.status === 'done' || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    // Compare dates (if dueDate is before start of today or past)
    return dueDate < now;
  };

  const getDaysOverdue = (dateStr) => {
    if (!dateStr) return 0;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        Loading commitments & backlog...
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const overdueTasks = pendingTasks.filter(isOverdue);
  const activeTasks = pendingTasks.filter(t => !isOverdue(t));
  const completedTasks = tasks.filter(t => t.status === 'done');

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

      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Action Items & Backlog
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage extracted tasks, deadlines, and high-priority overdue backlog.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {overdueTasks.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '0.35rem 0.75rem',
              borderRadius: '100px',
              fontSize: '0.78rem',
              fontWeight: 600
            }}>
              <AlertTriangle size={13} />
              <span>{overdueTasks.length} Overdue</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'var(--warm-bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            padding: '0.35rem 0.75rem',
            borderRadius: '100px',
            fontSize: '0.78rem',
            fontWeight: 500
          }}>
            <span>{pendingTasks.length} Pending</span>
          </div>
        </div>
      </div>

      {/* High-Priority Overdue Alert Banner if overdue tasks exist */}
      {overdueTasks.length > 0 && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #F87171',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={15} />
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#991B1B' }}>
                {overdueTasks.length} task{overdueTasks.length > 1 ? 's are' : ' is'} past the due date!
              </span>
              <span style={{ fontSize: '0.8rem', color: '#B91C1C', marginLeft: '0.5rem' }}>
                Overdue items are marked with highest priority in your backlog.
              </span>
            </div>
          </div>
          <button
            onClick={() => setFilterTab('overdue')}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Review Overdue Items
          </button>
        </div>
      )}

      {/* Manual Task Creation Form */}
      <form onSubmit={handleCreateManualTask} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Add a new task or backlog item..." 
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
          style={{
            flexGrow: 1,
            minWidth: '220px',
            padding: '0.75rem 1rem',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            fontSize: '0.9rem',
            background: '#FFFFFF'
          }}
        />
        <input 
          type="date"
          value={newTaskDueDate}
          onChange={(e) => setNewTaskDueDate(e.target.value)}
          title="Optional Due Date"
          style={{
            padding: '0.75rem 0.85rem',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            fontSize: '0.85rem',
            background: '#FFFFFF',
            color: newTaskDueDate ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.75rem 1.25rem' }}>
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </form>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterTab('all')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid',
            borderColor: filterTab === 'all' ? 'var(--text-primary)' : 'var(--border-color)',
            backgroundColor: filterTab === 'all' ? 'var(--text-primary)' : 'transparent',
            color: filterTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          All ({tasks.length})
        </button>

        <button
          onClick={() => setFilterTab('overdue')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid',
            borderColor: filterTab === 'overdue' ? '#DC2626' : (overdueTasks.length > 0 ? '#FCA5A5' : 'var(--border-color)'),
            backgroundColor: filterTab === 'overdue' ? '#DC2626' : (overdueTasks.length > 0 ? '#FEF2F2' : 'transparent'),
            color: filterTab === 'overdue' ? '#FFFFFF' : (overdueTasks.length > 0 ? '#DC2626' : 'var(--text-secondary)'),
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <AlertTriangle size={13} />
          <span>Overdue Backlog ({overdueTasks.length})</span>
        </button>

        <button
          onClick={() => setFilterTab('active')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid',
            borderColor: filterTab === 'active' ? 'var(--blue-accent)' : 'var(--border-color)',
            backgroundColor: filterTab === 'active' ? '#E8F0FE' : 'transparent',
            color: filterTab === 'active' ? 'var(--blue-accent)' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Active ({activeTasks.length})
        </button>

        <button
          onClick={() => setFilterTab('done')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid',
            borderColor: filterTab === 'done' ? 'var(--green-accent)' : 'var(--border-color)',
            backgroundColor: filterTab === 'done' ? '#DCFCE7' : 'transparent',
            color: filterTab === 'done' ? '#16A34A' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      {tasks.length === 0 ? (
        <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--warm-bg)' }}>
          <EmptyTasksDoodle />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 1. OVERDUE BACKLOG SECTION (Highest Priority) */}
          {(filterTab === 'all' || filterTab === 'overdue') && overdueTasks.length > 0 && (
            <div style={{
              backgroundColor: '#FFF5F5',
              border: '1.5px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#991B1B', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} style={{ color: '#DC2626' }} />
                  <span>🚨 Overdue & Backlog (Highest Priority)</span>
                  <span style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '100px',
                    fontWeight: 700
                  }}>
                    {overdueTasks.length} URGENT
                  </span>
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {overdueTasks.map(task => {
                  const daysLate = getDaysOverdue(task.due_date);
                  return (
                    <div key={task.id} style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FECACA',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.85rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'var(--transition)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <button 
                          onClick={() => handleToggleStatus(task)}
                          title="Mark complete"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            display: 'flex',
                            padding: 0
                          }}
                        >
                          <Square size={19} />
                        </button>
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#7F1D1D' }}>
                            {task.description}
                          </span>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            fontSize: '0.75rem', 
                            marginTop: '0.25rem',
                            flexWrap: 'wrap'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              <Clock size={11} />
                              <span>Overdue by {daysLate} {daysLate === 1 ? 'day' : 'days'}</span>
                            </span>
                            <span style={{ color: '#991B1B', fontSize: '0.72rem' }}>
                              Was due {formatDate(task.due_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete task"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#B91C1C',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. ACTIVE / UPCOMING TASKS */}
          {(filterTab === 'all' || filterTab === 'active') && (
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Active Commitments</span>
                <span className="badge" style={{ backgroundColor: '#F3F4F6' }}>{activeTasks.length}</span>
              </h3>
              {activeTasks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                  No active tasks pending.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeTasks.map(task => (
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
                              color: 'var(--blue-accent)',
                              marginTop: '0.25rem'
                            }}>
                              <Calendar size={11} />
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
          )}

          {/* 3. COMPLETED TASKS */}
          {(filterTab === 'all' || filterTab === 'done') && completedTasks.length > 0 && (
            <div style={{ borderTop: filterTab === 'all' ? '1px solid var(--border-color)' : 'none', paddingTop: filterTab === 'all' ? '1.5rem' : 0 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--green-accent)' }} />
                <span>Completed ({completedTasks.length})</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.7 }}>
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
export default Tasks;
