import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '../context/TutorialContext';
import { Lightbulb, ArrowRight, ArrowLeft, X, CheckCircle, Sparkles } from 'lucide-react';

export const GuidedTourModal = () => {
  const location = useLocation();
  const { 
    isTourActive, 
    currentStepIndex, 
    currentStep, 
    totalSteps, 
    nextStep, 
    prevStep, 
    skipTour, 
    completeTour 
  } = useTutorial();

  const [highlightRect, setHighlightRect] = useState(null);

  useEffect(() => {
    if (!isTourActive || location.pathname === '/login') {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      if (currentStep.highlightSelector) {
        const el = document.querySelector(currentStep.highlightSelector);
        if (el) {
          const rect = el.getBoundingClientRect();
          setHighlightRect({
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12
          });
          return;
        }
      }
      setHighlightRect(null);
    };

    updateHighlight();
    const timeout = setTimeout(updateHighlight, 250);
    window.addEventListener('resize', updateHighlight);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [isTourActive, currentStepIndex, currentStep]);

  if (!isTourActive || location.pathname === '/login') return null;

  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <>
      {/* 1. Target Element Spotlight Cutout */}
      {highlightRect && (
        <div 
          style={{
            position: 'fixed',
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 0 0 9999px rgba(15, 17, 23, 0.45), 0 0 0 2px #FFFFFF, 0 8px 30px rgba(0,0,0,0.3)',
            zIndex: 9990,
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      )}

      {/* 2. Non-obtrusive Bottom-Right Walkthrough Card (No full-screen blur blocking UI) */}
      <div 
        className="tour-floating-card"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: 'calc(100vw - 48px)',
          maxWidth: '400px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.18), 0 0 0 1px var(--border-color)',
          padding: '1.25rem 1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          animation: 'tourCardSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header & Step Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--warm-bg)',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            onClick={skipTour}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0.2rem 0.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
            title="Dismiss Tour"
          >
            End Tour <X size={13} />
          </button>
        </div>

        {/* Title & Description */}
        <div>
          <div style={{ 
            fontSize: '0.7rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.04em',
            marginBottom: '0.15rem' 
          }}>
            {currentStep.subtitle}
          </div>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            margin: '0 0 0.35rem 0'
          }}>
            {currentStep.title}
          </h3>
          <p style={{ 
            fontSize: '0.825rem', 
            color: 'var(--text-secondary)', 
            lineHeight: '1.45', 
            margin: 0 
          }}>
            {currentStep.description}
          </p>
        </div>

        {/* Tip */}
        {currentStep.tipText && (
          <div style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.65rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
            fontSize: '0.75rem',
            color: 'var(--text-primary)',
            lineHeight: '1.35'
          }}>
            <Lightbulb size={13} style={{ color: '#F59E0B', marginTop: '0.1rem', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 600 }}>Tip:</span> {currentStep.tipText}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
              color: currentStepIndex === 0 ? '#C4C4C0' : 'var(--text-primary)',
              opacity: currentStepIndex === 0 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <ArrowLeft size={12} /> Back
          </button>

          <button
            onClick={nextStep}
            className="btn btn-primary"
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {isLastStep ? (
              <>Finish Tour <CheckCircle size={13} /></>
            ) : (
              <>Next <ArrowRight size={13} /></>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
