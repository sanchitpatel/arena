import React from 'react';

export const CONVERSATIONS = [
  {
    id: 'stokes',
    title: "Stokes' Theorem in 3D",
    subject: 'Calculus III',
    topic: 'Vector Calculus',
    userQuery: "How do I conceptually connect the Fundamental Theorem of Calculus to Stokes' Theorem in 3D?",
    userTime: '7:32 PM',
    introText: (
      <>
        Both the Fundamental Theorem of Calculus (FTC) and Stokes&apos; Theorem are part of a deeper unifying idea:{' '}
        <strong className="font-semibold text-zinc-900">
          they relate the integral of a derivative over a region to the integral of the original function over the boundary of that region.
        </strong>
      </>
    ),
    card1: {
      title: 'Fundamental Theorem of Calculus (1D)',
      icon: 'trend',
      formula: (
        <div className="font-serif italic text-base sm:text-lg text-zinc-900 tracking-wide select-none py-0.5">
          <span className="text-xl sm:text-2xl not-italic font-normal mr-0.5">∫</span>
          <sub className="text-[10px] -ml-1 mr-0.5 not-italic">a</sub>
          <sup className="text-[10px] -ml-1 mr-1 not-italic">b</sup>
          <span>f &apos;(x) dx</span>
          <span className="mx-2 not-italic font-sans text-zinc-400">=</span>
          <span>f(b) − f(a)</span>
        </div>
      ),
      description: 'Relates the integral of a derivative over an interval to the values at its endpoints.',
    },
    card2: {
      title: "Stokes' Theorem (3D)",
      icon: 'stack',
      formula: (
        <div className="font-serif italic text-base sm:text-lg text-zinc-900 tracking-wide select-none py-0.5">
          <span className="text-xl sm:text-2xl not-italic font-normal mr-0.5">∬</span>
          <sub className="text-[10px] -ml-1 mr-1 not-italic font-sans font-bold">S</sub>
          <span>(∇ × </span>
          <strong className="not-italic font-bold">F</strong>
          <span>) · d</span>
          <strong className="not-italic font-bold">S</strong>
          <span className="mx-2 not-italic font-sans text-zinc-400">=</span>
          <span className="text-xl sm:text-2xl not-italic font-normal mr-0.5">∮</span>
          <sub className="text-[10px] -ml-1 mr-1 not-italic font-sans font-bold">C</sub>
          <strong className="not-italic font-bold">F</strong>
          <span> · d</span>
          <strong className="not-italic font-bold">r</strong>
        </div>
      ),
      description: 'Relates the surface integral of a curl over a surface S to the line integral of the vector field over its boundary C.',
    },
    keyInsight: (
      <>
        <strong className="font-semibold text-zinc-900">Stokes&apos; Theorem</strong> generalizes the FTC to higher dimensions: instead of an interval and its endpoints, we have a surface and its boundary curve, and instead of a derivative, we use the curl (∇ × F).
      </>
    ),
  },
  {
    id: 'quicksort',
    title: 'Quick Sort Analysis',
    subject: 'Algorithms',
    topic: 'Divide & Conquer',
    userQuery: 'Why does QuickSort run in O(n²) worst-case but O(n log n) expected time?',
    userTime: '6:14 PM',
    introText: (
      <>
        QuickSort&apos;s efficiency depends fundamentally on{' '}
        <strong className="font-semibold text-zinc-900">
          how evenly each partitioned pivot divides the remaining array into independent subproblems.
        </strong>
      </>
    ),
    card1: {
      title: 'Average Case (Balanced Partition)',
      icon: 'trend',
      formula: (
        <div className="font-mono text-sm sm:text-base text-zinc-900 select-none py-0.5 font-semibold">
          T(n) = 2T(n/2) + O(n) ⇒ <span className="text-black font-bold">O(n log n)</span>
        </div>
      ),
      description: 'When pivots roughly split the array in half, recursion depth is mathematically bounded by log₂ n.',
    },
    card2: {
      title: 'Worst Case (Degenerate Partition)',
      icon: 'stack',
      formula: (
        <div className="font-mono text-sm sm:text-base text-zinc-900 select-none py-0.5 font-semibold">
          T(n) = T(n-1) + O(n) ⇒ <span className="text-black font-bold">O(n²)</span>
        </div>
      ),
      description: 'Picking the minimum or maximum element repeatedly collapses the tree into a linked list of depth n.',
    },
    keyInsight: (
      <>
        <strong className="font-semibold text-zinc-900">Randomized Pivoting</strong> or Median-of-Three guarantees expected O(n log n) runtime and protects against adversarial sorted inputs.
      </>
    ),
  },
  {
    id: 'bayes',
    title: "Bayes' Theorem",
    subject: 'Probability & Statistics',
    topic: 'Bayesian Inference',
    userQuery: "Can you explain Bayes' Theorem intuitively with a medical diagnostic example?",
    userTime: '5:08 PM',
    introText: (
      <>
        Bayes&apos; Theorem updates our belief in a hypothesis given observed evidence:{' '}
        <strong className="font-semibold text-zinc-900">
          Posterior Probability = (Likelihood × Prior) / Marginal Evidence.
        </strong>
      </>
    ),
    card1: {
      title: 'Prior Probability P(H)',
      icon: 'trend',
      formula: (
        <div className="font-serif italic text-base sm:text-lg text-zinc-900 select-none py-0.5">
          <span>P(Condition) = </span>
          <span className="font-sans not-italic font-bold">0.01 (1% base rate)</span>
        </div>
      ),
      description: 'The baseline frequency of the condition in the broader population before testing.',
    },
    card2: {
      title: 'Posterior Probability P(H|E)',
      icon: 'stack',
      formula: (
        <div className="font-serif italic text-base sm:text-lg text-zinc-900 select-none py-0.5">
          <span>P(H|E) = </span>
          <span className="font-sans not-italic font-bold text-black">[ P(E|H) · P(H) ] / P(E) ≈ 16.4%</span>
        </div>
      ),
      description: 'Even with a 95% accurate test, a rare 1% prior means false positives often outnumber true positives.',
    },
    keyInsight: (
      <>
        <strong className="font-semibold text-zinc-900">Always account for the base rate:</strong> rare hypotheses require overwhelmingly high specificity before a positive signal indicates strong posterior certainty.
      </>
    ),
  },
  {
    id: 'thermo',
    title: 'Thermodynamics Basics',
    subject: 'Physics',
    topic: 'Classical Thermodynamics',
    userQuery: 'What is the conceptual bridge between the First and Second Laws of Thermodynamics?',
    userTime: '3:45 PM',
    introText: (
      <>
        The First Law governs{' '}
        <strong className="font-semibold text-zinc-900">conservation of energy</strong>, while the Second Law dictates the{' '}
        <strong className="font-semibold text-zinc-900">unidirectional arrow of natural processes.</strong>
      </>
    ),
    card1: {
      title: 'First Law (Conservation)',
      icon: 'trend',
      formula: (
        <div className="font-serif italic text-base sm:text-lg text-zinc-900 select-none py-0.5">
          <span>ΔU = Q − W</span>
        </div>
      ),
      description: 'Energy cannot be created or destroyed; heat supplied minus work done equals internal energy change.',
    },
    card2: {
      title: 'Second Law (Entropy)',
      icon: 'stack',
      formula: (
        <div className="font-serif italic text-base sm:text-lg text-zinc-900 select-none py-0.5">
          <span>ΔS</span>
          <sub className="text-[10px] not-italic font-sans">isolated</sub>
          <span className="mx-1.5 not-italic font-sans text-zinc-400">≥</span>
          <span className="not-italic font-sans font-bold">0</span>
        </div>
      ),
      description: 'The entropy of an isolated thermodynamic system never decreases over time.',
    },
    keyInsight: (
      <>
        <strong className="font-semibold text-zinc-900">Energy quantity is conserved, but quality degrades:</strong> entropy ensures heat cannot spontaneously flow from a colder to a hotter reservoir.
      </>
    ),
  },
];
