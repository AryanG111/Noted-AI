import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  FileText, 
  Clock, 
  Users, 
  CheckSquare, 
  GitFork, 
  LogOut, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { user, logout, activeKernel, updateKernel } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/notes', label: 'Notes', icon: FileText },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/contacts', label: 'Contacts', icon: Users },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/graph', label: 'Memory Graph', icon: GitFork },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo and Brand */}
        <div style={{ padding: '0 0.75rem', marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase',
            color: 'var(--text-primary)'
          }}>
            Noted
          </h2>
        </div>

        {/* Navigation List */}
        <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li className="nav-item">
                <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                  <Home size={15} />
                  <span>Home</span>
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <span style={{ 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              letterSpacing: '0.05em', 
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              padding: '0 0.75rem',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              Workspace
            </span>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li className="nav-item">
                <NavLink to="/notes" className={({ isActive }) => isActive ? 'active' : ''}>
                  <FileText size={15} />
                  <span>Notes</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/timeline" className={({ isActive }) => isActive ? 'active' : ''}>
                  <Clock size={15} />
                  <span>Timeline</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
                  <CheckSquare size={15} />
                  <span>Tasks</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/contacts" className={({ isActive }) => isActive ? 'active' : ''}>
                  <Users size={15} />
                  <span>Contacts</span>
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <span style={{ 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              letterSpacing: '0.05em', 
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              padding: '0 0.75rem',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              Intelligence
            </span>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li className="nav-item">
                <NavLink to="/graph" className={({ isActive }) => isActive ? 'active' : ''}>
                  <GitFork size={15} />
                  <span>Memory Graph</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

        {/* Active Kernel Info */}
        <div style={{ padding: '0 0.75rem', cursor: 'pointer' }} onClick={() => {
          const next = activeKernel === 'ollama' ? 'gemini' : activeKernel === 'gemini' ? 'groq' : 'ollama';
          updateKernel(next);
        }}>
          <span style={{ 
            fontSize: '0.65rem', 
            fontWeight: 600, 
            letterSpacing: '0.05em', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '0.25rem'
          }}>
            AI Engine
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ 
              width: '5px', 
              height: '5px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--text-primary)',
              display: 'inline-block' 
            }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {activeKernel === 'ollama' ? 'Ollama · Local' : activeKernel === 'gemini' ? 'Gemini · Cloud' : 'Groq · Cloud'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

        {/* User Profile Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.full_name || (user?.email ? user.email.split('@')[0] : 'Member')}
            </span>
            <span style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.occupation || 'Workspace Member'}
            </span>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
              borderRadius: 'var(--radius-sm)',
              transition: 'var(--transition)'
            }}
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
