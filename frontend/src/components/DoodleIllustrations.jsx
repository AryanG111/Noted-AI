import React from 'react';

// Hand-drawn spark icon for AI actions
export const SparkleDoodle = ({ size = 20, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`doodle-sparkle ${className}`}
    style={{ transform: 'rotate(-5deg)' }}
  >
    <path d="M12 3c.13 2.18 1.13 3.82 2.85 4.85C16.82 8.87 18.82 9 21 9c-2.18.13-3.82 1.13-4.85 2.85C15.13 13.82 15 15.82 15 18c-.13-2.18-1.13-3.82-2.85-4.85C10.18 12.13 8.18 12 6 12c2.18-.13 3.82-1.13 4.85-2.85C11.87 7.18 12 5.18 12 3z" />
  </svg>
);

// Hand-drawn imperfect arrow connection
export const ArrowDoodle = ({ className = '' }) => (
  <svg 
    width="48" 
    height="48" 
    viewBox="0 0 48 48" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    className={`doodle-arrow ${className}`}
  >
    <path d="M8 12c6 6 12 2 18 10 3 4 5 10 10 12" />
    <path d="M30 34c4 1 7 1 8 0l-3-7" />
  </svg>
);

// Empty Notes illustration
export const EmptyNotesDoodle = () => (
  <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="var(--purple-accent)" strokeWidth="1.5" strokeLinecap="round">
      {/* Notebook base outline with slight irregularities */}
      <path d="M35 25 C 50 24, 75 26, 85 25 C 88 35, 87 70, 85 95 C 70 96, 45 94, 35 95 C 32 80, 33 45, 35 25 Z" strokeDasharray="3 3" />
      {/* Writing pencil */}
      <path d="M85 30 L 95 20 C 97 18, 100 21, 98 23 L 88 33 Z" />
      <path d="M85 30 L 88 33" />
      {/* Hand-drawn text lines */}
      <path d="M43 40 C 50 39, 65 41, 75 40" />
      <path d="M43 55 C 55 54, 60 56, 77 55" />
      <path d="M43 70 C 48 71, 62 69, 70 70" />
      {/* Loop binds */}
      <path d="M32 35 C 28 35, 28 39, 32 39" />
      <path d="M32 50 C 28 50, 28 54, 32 54" />
      <path d="M32 65 C 28 65, 28 69, 32 69" />
      <path d="M32 80 C 28 80, 28 84, 32 84" />
    </svg>
    <p style={{ marginTop: '1.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>Your memory is empty.</p>
    <p className="doodle-text" style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>Write something. I'll start connecting the dots.</p>
  </div>
);

// Empty Tasks illustration
export const EmptyTasksDoodle = () => (
  <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round">
      {/* Hand-drawn checkmark with loops */}
      <path d="M25 52 C 30 57, 36 65, 42 72 C 52 50, 68 32, 80 20" />
      {/* Small circle accent */}
      <circle cx="45" cy="50" r="30" strokeDasharray="4 4" stroke="#E5E7EB" />
    </svg>
    <p style={{ marginTop: '1.5rem', fontWeight: 500, color: '#202124' }}>Nothing pending.</p>
    <p className="doodle-text" style={{ fontSize: '1.1rem', marginTop: '0.25rem', color: '#34A853' }}>Enjoy the rare moment.</p>
  </div>
);

// Empty Contacts illustration
export const EmptyContactsDoodle = () => (
  <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round">
      {/* Node circles */}
      <circle cx="30" cy="30" r="10" />
      <circle cx="90" cy="40" r="12" />
      <circle cx="55" cy="75" r="8" />
      {/* Connective dashed lines */}
      <path d="M40 33 L 78 37" strokeDasharray="3 3" />
      <path d="M80 47 L 62 69" strokeDasharray="3 3" />
      <path d="M35 38 L 50 68" strokeDasharray="3 3" />
    </svg>
    <p style={{ marginTop: '1.5rem', fontWeight: 500, color: '#202124' }}>No contacts found.</p>
    <p className="doodle-text" style={{ fontSize: '1.1rem', marginTop: '0.25rem', color: '#4285F4' }}>People you mention will start appearing here.</p>
  </div>
);
