import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SparkleDoodle } from '../components/DoodleIllustrations';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [occupation, setOccupation] = useState('Software Engineer');
  const [aiTone, setAiTone] = useState('balanced');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, token } = useAuth();

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      if (isRegister) {
        const newUser = await register(email, password, fullName, occupation, aiTone);
        if (newUser && newUser.status === 'pending') {
          setSuccessMessage('Registration request submitted! Your account is currently pending administrator approval before you can log in.');
        } else {
          setSuccessMessage('Account created and approved! You can now sign in.');
        }
        setIsRegister(false);
        setPassword(''); // Clear password for security
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FAF9F6',
      fontFamily: 'var(--font-sans)',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
        position: 'relative'
      }}>
        {/* Playful top annotation */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '20px',
          transform: 'rotate(6deg)'
        }}>
          <span className="doodle-text" style={{ fontSize: '1.2rem', color: 'var(--purple-accent)' }}>
            ✦ hello there!
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <SparkleDoodle size={24} className="text-purple" style={{ color: 'var(--purple-accent)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Noted AI</h1>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '2rem' }}>
          An AI-powered cognitive workspace with long-term memory.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FCE8E6',
            color: 'var(--red-accent)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            border: '1px solid #FAD2CF'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            backgroundColor: '#E6F4EA',
            color: '#137333',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            border: '1px solid #CEEAD6'
          }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isRegister && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Sharma"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    transition: 'var(--transition)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    transition: 'var(--transition)',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Writer / Content Creator">Writer / Content Creator</option>
                  <option value="Student">Student</option>
                  <option value="Manager / Executive">Manager / Executive</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>AI Tone Preference</label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    transition: 'var(--transition)',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="balanced">Balanced (Normal Summary)</option>
                  <option value="concise">Concise (Bullet points & Key phrases)</option>
                  <option value="technical">Technical (Detailed specs & jargon)</option>
                  <option value="creative">Creative (Catchy titles & analogies)</option>
                </select>
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'var(--transition)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'var(--transition)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '0.8rem',
              marginTop: '0.5rem',
              width: '100%',
              fontSize: '0.95rem'
            }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isRegister ? 'Already have an account? ' : "New to Noted AI? "}
          </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--blue-accent)',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Sign In instead' : 'Create an account'}
          </button>
        </div>
      </div>
    </div>
  );
};
