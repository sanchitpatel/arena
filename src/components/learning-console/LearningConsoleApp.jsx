import React, { useState } from 'react';
import { useAuth } from '../dashboard/AuthContext';
import { ConsoleSidebar } from './ConsoleSidebar';
import { ConsoleHeader } from './ConsoleHeader';
import { ConsoleChatView } from './ConsoleChatView';
import { ConsoleInputBar } from './ConsoleInputBar';
import { StudyPlanModal } from './StudyPlanModal';
import { UpgradeModal } from './UpgradeModal';
import { CONVERSATIONS } from './conversationsData';

export const LearningConsoleApp = ({ onSignOut }) => {
  const auth = useAuth();
  const handleSignOut = onSignOut || auth?.signOut;
  const [activeChatId, setActiveChatId] = useState('stokes');
  const [activeNav, setActiveNav] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studyPlanOpen, setStudyPlanOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Per-conversation follow-up message storage
  const [followUpsByChat, setFollowUpsByChat] = useState({});
  const [isThinking, setIsThinking] = useState(false);

  // Current active conversation
  const currentChat =
    CONVERSATIONS.find((c) => c.id === activeChatId) || CONVERSATIONS[0];

  const currentFollowUps = followUpsByChat[activeChatId] || [];

  const handleSendMessage = (text) => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg = {
      role: 'user',
      text,
      time: timeStr,
    };

    // Append user message immediately
    setFollowUpsByChat((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), userMsg],
    }));

    setIsThinking(true);

    // Generate intelligent Socratic response after brief delay
    setTimeout(() => {
      let replyText = '';
      const lower = text.toLowerCase();

      if (activeChatId === 'stokes') {
        if (lower.includes('curl') || lower.includes('boundary')) {
          replyText =
            'Excellent insight. The curl ∇ × F measures the infinitesimal rotation at each point on the surface. When you sum these micro-vorticities over the entire surface S, interior cancelations leave only the net boundary flow along C. This is why Stokes’ Theorem can be viewed as an extension of Green’s Theorem to arbitrary 3D manifolds.';
        } else {
          replyText =
            'Let’s test your intuition: If you traverse the boundary curve C according to the right-hand rule with your thumb aligned with the surface normal vector dS, how does the circulation of F relate to the net vortex flux passing through S?';
        }
      } else if (activeChatId === 'quicksort') {
        if (lower.includes('pivot') || lower.includes('partition')) {
          replyText =
            'Precisely. With randomized pivot selection or median-of-three, the probability of selecting an extreme element at every recursion level becomes 1/n!, which is practically negligible. The expected height of the recursion tree remains 2 ln n ≈ 1.39 log₂ n, cementing average-case O(n log n).';
        } else {
          replyText =
            'Consider the recurrence relation T(n) = T(n-1) + O(n). When expanded, this yields n + (n-1) + ... + 1 = n(n+1)/2 = O(n²). How does choosing the median of three elements (first, middle, last) fundamentally disrupt this worst-case degeneration?';
        }
      } else if (activeChatId === 'bayes') {
        if (lower.includes('prior') || lower.includes('false positive')) {
          replyText =
            'Spot on. This is the Classic Base Rate Fallacy. Even with a 99% accurate test, if a condition affects 1 in 10,000 people, the raw number of false positives (1% of 9,999 ≈ 100) will still outnumber the true positives (~1). High precision alone is not enough when priors are minuscule.';
        } else {
          replyText =
            'Consider 10,000 individuals tested for a 1% prevalence condition with 95% sensitivity and 95% specificity: 100 actually have it (95 true positives), while 9,900 do not (495 false positives). What fraction of positive tests actually represent true illness?';
        }
      } else if (activeChatId === 'thermo') {
        if (lower.includes('entropy') || lower.includes('reversible')) {
          replyText =
            'Exactly. A reversible process keeps the total entropy change of the universe at zero (ΔS_universe = 0), while every spontaneous, irreversible process increases it (ΔS_universe > 0). This is why a drop of ink disperses in water but never spontaneously coalesces back into a droplet.';
        } else {
          replyText =
            'The First Law tells us energy is conserved, meaning a hot cup of coffee cooling down is allowed, but so would be a cool cup spontaneously heating up by absorbing heat from the room. Why does only the Second Law rule out the latter?';
        }
      } else {
        replyText =
          'That is a great follow-up question. Let’s break it down into fundamental first principles: what is the core assumption being made here, and what happens at the boundary condition?';
      }

      const tutorMsg = {
        role: 'tutor',
        text: replyText,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setFollowUpsByChat((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), tutorMsg],
      }));
      setIsThinking(false);
    }, 700);
  };

  const handleNewChat = () => {
    // Switch to first conversation or clear thread
    setActiveChatId('stokes');
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] text-zinc-800 flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden font-sans select-none">
      {/* ── Subtly Curved Ambient Light Highlights (matching reference image) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        {/* Soft diagonal highlight sweeping from top left */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(230,235,245,0.6) 50%, transparent 80%)',
          }}
        />
        {/* Soft ambient bottom glow */}
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30 blur-[130px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(220,230,245,0.4) 60%, transparent 80%)',
          }}
        />
      </div>

      {/* ── Master App Console Window (matching reference image) ── */}
      <div className="relative z-10 w-full max-w-[1240px] h-[92vh] sm:h-[88vh] max-h-[860px] bg-white rounded-[24px] sm:rounded-[32px] border border-zinc-200/80 shadow-[0_20px_60px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-full">
          <ConsoleSidebar
            activeChatId={activeChatId}
            onSelectChat={setActiveChatId}
            onNewChat={handleNewChat}
            activeNav={activeNav}
            onNavChange={setActiveNav}
            onSignOut={handleSignOut}
            onOpenUpgrade={() => setUpgradeOpen(true)}
          />
        </div>

        {/* Mobile Slide-over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[80vw] bg-[#FAFAFA] h-full shadow-2xl z-10 flex flex-col">
              <ConsoleSidebar
                activeChatId={activeChatId}
                onSelectChat={setActiveChatId}
                onNewChat={handleNewChat}
                activeNav={activeNav}
                onNavChange={setActiveNav}
                onSignOut={handleSignOut}
                onCloseMobile={() => setMobileMenuOpen(false)}
                onOpenUpgrade={() => {
                  setMobileMenuOpen(false);
                  setUpgradeOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden min-w-0">
          {/* Header */}
          <ConsoleHeader
            subject={currentChat.subject}
            topic={currentChat.topic}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenStudyPlan={() => setStudyPlanOpen(true)}
          />

          {/* Interactive Chat / Workbench Area */}
          <ConsoleChatView
            conversation={currentChat}
            followUpMessages={currentFollowUps}
            isThinking={isThinking}
          />

          {/* Bottom Follow-Up Question Bar */}
          <ConsoleInputBar
            onSendMessage={handleSendMessage}
            disabled={isThinking}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      <StudyPlanModal
        isOpen={studyPlanOpen}
        onClose={() => setStudyPlanOpen(false)}
        currentTopic={currentChat.topic}
      />

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
};

export default LearningConsoleApp;
