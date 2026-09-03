import React from 'react';
import { useTutorial } from '../context/TutorialContext';
import { Lightbulb, X, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

export const TabGuideModal = () => {
  const { isTabGuideOpen, closeTabGuide, currentTabHelp, startTour } = useTutorial();

  if (!isTabGuideOpen) return null;

  return (
    <div 
      className="tab-guide-overlay"
      onClick={closeTabGuide}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        backgroundColor: 'rgba(15, 17, 23, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div 
        className="tab-guide-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px var(--border-color)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--warm-bg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}>
              <Lightbulb size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
              Page Guide
            </span>
          </div>

          <button 
            onClick={closeTabGuide}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Title & Summary */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
            {currentTabHelp.title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            {currentTabHelp.summary}
          </p>
        </div>

        {/* Bullet Tips */}
        {currentTabHelp.tips && currentTabHelp.tips.length > 0 && (
          <div style={{ 
            backgroundColor: 'var(--surface-bg)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Key Shortcuts & Capabilities
            </span>
            {currentTabHelp.tips.map((tip, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                <CheckCircle2 size={14} style={{ marginTop: '0.15rem', color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => startTour(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0'
            }}
          >
            <HelpCircle size={14} /> Full Guided Tour
          </button>

          <button
            onClick={closeTabGuide}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.825rem',
              fontWeight: 500
            }}
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
