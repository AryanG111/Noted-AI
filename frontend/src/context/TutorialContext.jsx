import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TutorialContext = createContext(null);

export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Noted',
    subtitle: 'Your Second Brain',
    description: 'Noted is designed to automatically extract tasks, tag contacts, and map your thoughts as you write without manual organizing.',
    targetRoute: '/',
    highlightSelector: null,
    tipText: 'This quick tour will show you the core capabilities of each tab in under 30 seconds.'
  },
  {
    id: 'home-search',
    title: 'Instant Search & Recall',
    subtitle: 'Natural Language Memory Query',
    description: 'Ask anything about your notes, past meetings, commitments, or contacts. Try questions like "What is due this week?" or "Meeting notes".',
    targetRoute: '/',
    highlightSelector: '.search-section-container',
    tipText: 'Hover over the search bar anytime to see quick suggestions or press ⌘K to open the quick switcher.'
  },
  {
    id: 'notes-tab',
    title: 'Notes & AI Auto-Extraction',
    subtitle: 'Effortless Capture',
    description: 'Type raw meeting notes, ideas, or quick thoughts. In the background, Noted extracts commitments with due dates and tags people mentioned.',
    targetRoute: '/notes',
    highlightSelector: null,
    tipText: 'Notes auto-save as you type. Watch the AI Extraction panel on the right identify action items automatically.'
  },
  {
    id: 'tasks-tab',
    title: 'Extracted Tasks & Commitments',
    subtitle: 'Zero-Effort Todo List',
    description: 'Every action item discovered in your notes automatically appears here with due dates. You can also add and check off tasks manually.',
    targetRoute: '/tasks',
    highlightSelector: null,
    tipText: 'Tasks link directly back to the original note where they were captured.'
  },
  {
    id: 'contacts-tab',
    title: 'People & Contact Memory',
    subtitle: 'Automatic Relationship Intelligence',
    description: 'When people are mentioned in notes or meetings, Noted creates a dossier tracking conversations, roles, and related action items.',
    targetRoute: '/contacts',
    highlightSelector: null,
    tipText: 'Click any contact to view all linked notes and commitments involving them.'
  },
  {
    id: 'graph-tab',
    title: 'Interactive Memory Graph',
    subtitle: 'Knowledge Graph Visualization',
    description: 'Explore the visual neural web connecting your notes, tasks, and contacts. Drag nodes around to see how your knowledge interconnects.',
    targetRoute: '/graph',
    highlightSelector: null,
    tipText: 'Click any node to zoom into its details and connected references.'
  },
  {
    id: 'timeline-tab',
    title: 'Chronological Timeline',
    subtitle: 'Activity Feed',
    description: 'Review a chronological stream of your synthesized thoughts, completed tasks, and collaborator interactions over time.',
    targetRoute: '/timeline',
    highlightSelector: null,
    tipText: 'Track your personal knowledge momentum day by day.'
  }
];

export const TAB_HELP = {
  '/': {
    title: 'Home Dashboard',
    summary: 'Your daily cockpit. Review today’s commitments, recent memories, proactive reminders, and search your entire memory base with natural language.',
    tips: [
      'Hover over the search bar to reveal instant suggestion pills.',
      'Press ⌘K or Ctrl+K anywhere to launch the Command Switcher.',
      'Click on any KPI card (Notes, Tasks, Contacts, Graph) to jump straight to that tab.'
    ]
  },
  '/notes': {
    title: 'Notes Workspace',
    summary: 'Capture raw thoughts, meeting transcripts, and journals. The AI kernel silently reads your text and extracts tasks, due dates, and people.',
    tips: [
      'Notes auto-save as you type — no save button needed.',
      'Mention names or dates (e.g. "Meet Vishal this Friday") to automatically populate Contacts and Tasks.',
      'The right panel displays live AI entity extraction and summarization.'
    ]
  },
  '/tasks': {
    title: 'Tasks & Commitments',
    summary: 'A unified view of all action items, commitments, and deadlines extracted from your notes.',
    tips: [
      'Check off completed tasks to archive them.',
      'Add manual tasks anytime using the quick input at the top.',
      'Tasks extracted from notes include a direct link back to the source memory.'
    ]
  },
  '/contacts': {
    title: 'People & Dossiers',
    summary: 'A directory of everyone referenced in your notes with a chronological timeline of interactions and open commitments.',
    tips: [
      'Select any contact to edit their role or workspace context.',
      'View all memories and shared tasks with a specific person in one place.'
    ]
  },
  '/graph': {
    title: 'Memory Knowledge Graph',
    summary: 'A dynamic physics-based network visualizing how your notes, people, and action items interconnect.',
    tips: [
      'Click and drag nodes to rearrange your knowledge cluster.',
      'Select any node to view its relations and linked context in the inspector.',
      'Scroll or use zoom controls to navigate dense knowledge webs.'
    ]
  },
  '/timeline': {
    title: 'Activity Timeline',
    summary: 'A chronological stream of all thoughts, note creations, task completions, and mentions over time.',
    tips: [
      'Filter and scroll back in time to review past decisions.',
      'Click any event to open its full detail view.'
    ]
  },
  '/admin': {
    title: 'User Administration',
    summary: 'Manage user access, review pending registration requests, and maintain authorized members.',
    tips: [
      'Approve or reject new user signup requests.',
      'Delete unauthorized accounts to keep your workspace secure.'
    ]
  }
};

export const TutorialProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Onboarding Guided Tour State
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Tab Bulb Guide Modal State
  const [isTabGuideOpen, setIsTabGuideOpen] = useState(false);
  const [activeGuideRoute, setActiveGuideRoute] = useState(null);

  // Check if first-time user (force tour on first login)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('noted_tour_completed');
    if (!hasSeenTour) {
      // Delay slightly for smooth page load
      const timer = setTimeout(() => {
        setIsTourActive(true);
        setCurrentStepIndex(0);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = (forceFromBeginning = true) => {
    if (forceFromBeginning) {
      setCurrentStepIndex(0);
      navigate(TUTORIAL_STEPS[0].targetRoute);
    }
    setIsTourActive(true);
    setIsTabGuideOpen(false);
  };

  const nextStep = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const nextTargetRoute = TUTORIAL_STEPS[nextIndex].targetRoute;
      if (nextTargetRoute && location.pathname !== nextTargetRoute) {
        navigate(nextTargetRoute);
      }
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      const prevTargetRoute = TUTORIAL_STEPS[prevIndex].targetRoute;
      if (prevTargetRoute && location.pathname !== prevTargetRoute) {
        navigate(prevTargetRoute);
      }
    }
  };

  const completeTour = () => {
    setIsTourActive(false);
    localStorage.setItem('noted_tour_completed', 'true');
  };

  const skipTour = () => {
    setIsTourActive(false);
    localStorage.setItem('noted_tour_completed', 'true');
  };

  const openTabGuide = (specificRoute = null) => {
    setActiveGuideRoute(specificRoute || location.pathname);
    setIsTabGuideOpen(true);
  };

  const closeTabGuide = () => {
    setIsTabGuideOpen(false);
    setActiveGuideRoute(null);
  };

  const currentStep = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
  const targetHelpKey = activeGuideRoute || location.pathname;
  const currentTabHelp = TAB_HELP[targetHelpKey] || TAB_HELP['/'];

  return (
    <TutorialContext.Provider value={{
      isTourActive,
      currentStepIndex,
      currentStep,
      totalSteps: TUTORIAL_STEPS.length,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      completeTour,
      isTabGuideOpen,
      openTabGuide,
      closeTabGuide,
      currentTabHelp
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
