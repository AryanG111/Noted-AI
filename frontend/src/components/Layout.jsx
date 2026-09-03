import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';
import { 
  Home, 
  FileText, 
  Clock, 
  Users, 
  CheckSquare, 
  GitFork, 
  LogOut, 
  Sparkles,
  Menu,
  X,
  Cpu,
  ShieldCheck,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { user, logout, activeKernel, updateKernel } = useAuth();
  const { openTabGuide, startTour } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const cycleKernel = () => {
    const next = activeKernel === 'ollama' ? 'gemini' : activeKernel === 'gemini' ? 'groq' : 'ollama';
    updateKernel(next);
  };

  const bottomNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/notes', label: 'Notes', icon: FileText },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/contacts', label: 'Contacts', icon: Users },
  ];

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ 
            fontSize: '0.95rem', 
            fontWeight: 700, 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase',
            color: 'var(--text-primary)'
          }}>
            Noted
          </span>
        </div>

        {/* Header Right Tools: Bulb Guide and Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={openTabGuide}
            style={{
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
            title="How to use this page"
          >
            <Lightbulb size={15} />
          </button>

          {/* AI Engine Switcher Chip for Mobile */}
          <button 
            onClick={cycleKernel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
              padding: '0.3rem 0.6rem',
              borderRadius: '100px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)'
            }}
            title="Switch AI Engine"
          >
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: activeKernel === 'ollama' ? '#10B981' : '#6D5DFC'
            }} />
            <span style={{ fontWeight: 500 }}>
              {activeKernel === 'ollama' ? 'Ollama' : activeKernel === 'gemini' ? 'Gemini' : 'Groq'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="mobile-drawer-backdrop" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar (Desktop Sidebar & Mobile Drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo and Brand */}
        <div style={{ 
          padding: '0 0.75rem', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase', 
            color: 'var(--text-primary)', 
            margin: 0 
          }}>
            Noted
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {/* Quick Tour Trigger */}
            <button
              onClick={() => startTour(true)}
              className="tab-guide-bulb-btn"
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.25rem 0.45rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                transition: 'var(--transition)'
              }}
              title="Start Interactive Tour"
            >
              <HelpCircle size={13} />
              <span>Tour</span>
            </button>

            {/* Close button inside mobile drawer */}
            <button 
              onClick={closeMobileMenu}
              className="show-on-mobile hide-on-desktop"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.25rem'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li className="nav-item sidebar-tab-row">
                <NavLink to="/" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                  <Home size={15} />
                  <span>Home</span>
                </NavLink>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTabGuide('/');
                  }}
                  className="nav-bulb-trigger"
                  title="How to use Home"
                  aria-label="Home guide"
                >
                  <Lightbulb size={13} />
                </button>
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
              <li className="nav-item sidebar-tab-row">
                <NavLink to="/notes" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                  <FileText size={15} />
                  <span>Notes</span>
                </NavLink>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTabGuide('/notes');
                  }}
                  className="nav-bulb-trigger"
                  title="How to use Notes"
                  aria-label="Notes guide"
                >
                  <Lightbulb size={13} />
                </button>
              </li>
              <li className="nav-item sidebar-tab-row">
                <NavLink to="/timeline" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                  <Clock size={15} />
                  <span>Timeline</span>
                </NavLink>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTabGuide('/timeline');
                  }}
                  className="nav-bulb-trigger"
                  title="How to use Timeline"
                  aria-label="Timeline guide"
                >
                  <Lightbulb size={13} />
                </button>
              </li>
              <li className="nav-item sidebar-tab-row">
                <NavLink to="/tasks" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                  <CheckSquare size={15} />
                  <span>Tasks</span>
                </NavLink>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTabGuide('/tasks');
                  }}
                  className="nav-bulb-trigger"
                  title="How to use Tasks"
                  aria-label="Tasks guide"
                >
                  <Lightbulb size={13} />
                </button>
              </li>
              <li className="nav-item sidebar-tab-row">
                <NavLink to="/contacts" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                  <Users size={15} />
                  <span>Contacts</span>
                </NavLink>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTabGuide('/contacts');
                  }}
                  className="nav-bulb-trigger"
                  title="How to use Contacts"
                  aria-label="Contacts guide"
                >
                  <Lightbulb size={13} />
                </button>
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
              <li className="nav-item sidebar-tab-row">
                <NavLink to="/graph" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                  <GitFork size={15} />
                  <span>Memory Graph</span>
                </NavLink>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTabGuide('/graph');
                  }}
                  className="nav-bulb-trigger"
                  title="How to use Memory Graph"
                  aria-label="Memory Graph guide"
                >
                  <Lightbulb size={13} />
                </button>
              </li>
            </ul>
          </div>

          {user?.role === 'admin' && (
            <div>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                letterSpacing: '0.05em', 
                color: 'var(--purple-accent)',
                textTransform: 'uppercase',
                padding: '0 0.75rem',
                display: 'block',
                marginBottom: '0.5rem'
              }}>
                Administration
              </span>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li className="nav-item sidebar-tab-row">
                  <NavLink to="/admin" onClick={closeMobileMenu} className={({ isActive }) => isActive ? 'active' : ''} style={{ flexGrow: 1 }}>
                    <ShieldCheck size={15} />
                    <span>Users</span>
                  </NavLink>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openTabGuide('/admin');
                    }}
                    className="nav-bulb-trigger"
                    title="How to use Administration"
                    aria-label="Admin guide"
                  >
                    <Lightbulb size={13} />
                  </button>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

        {/* Active Kernel Info */}
        <div style={{ padding: '0 0.75rem', cursor: 'pointer' }} onClick={cycleKernel}>
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
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: activeKernel === 'ollama' ? '#10B981' : '#6D5DFC',
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={isActive ? 'active' : ''}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
