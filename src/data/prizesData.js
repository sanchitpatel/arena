/**
 * Official Arena Prize Road & Milestone Progression Data
 *
 * Exact replication of the reference Prize Road hierarchy:
 * 8 Stages from Stage 1 (Welcome Kit) to Stage 8 (Grand Prize - VIP Incubation Access).
 */

export const PRIZE_STAGES = [
  {
    id: 'stage-1',
    stage: 1,
    points: 100,
    title: 'Welcome Kit',
    subtitle: '(100 Points)',
    badgeText: 'Stage 1',
    iconType: 'gift',
    unlocked: true,
    claimed: true,
    description: 'Claim your official Arena Initiate welcome pack including an NFC smart badge, holographic decals, and starter event tokens.',
    perks: [
      'Official Arena Holographic Decals Pack',
      'High-Density NFC VIP Attendee Lanyard',
      'Initial 100 Player Telemetry Points',
    ],
    redemptionLocation: 'Lab Entry Porch / Reception Desk',
    xPercent: 44.8,
    yPercent: 84.3,
    side: 'left',
  },
  {
    id: 'stage-2',
    stage: 2,
    points: 300,
    title: 'Early Access',
    subtitle: '',
    badgeText: 'Stage 2',
    iconType: 'lightning',
    unlocked: true,
    claimed: true,
    description: 'Unlock exclusive developer early access to upcoming Arena game modes, experimental tools, and private beta builds.',
    perks: [
      'Private Beta Access to Arena Live Duels',
      'Early access to Incubation Cohort prototypes',
      'VIP Barista Nitro Cold Brew pass',
    ],
    redemptionLocation: 'Kitchen Refuel Station Counter',
    xPercent: 55.2,
    yPercent: 75.0,
    side: 'right',
  },
  {
    id: 'stage-3',
    stage: 3,
    points: 1000,
    title: 'Arena Credits',
    subtitle: '(1,000 Points)',
    badgeText: 'Stage 3',
    iconType: 'coins',
    unlocked: false,
    claimed: false,
    description: '1,000 Arena Credits credited directly to your digital player wallet for crowd betting, power-ups, and live duel wagers.',
    perks: [
      '1,000 In-App Arena Live Duel Credits',
      'Crowd Trivia Double-Wager Privilege',
      'Custom Wallet Badge',
    ],
    redemptionLocation: 'Arena Digital Wallet',
    xPercent: 44.8,
    yPercent: 65.7,
    side: 'left',
  },
  {
    id: 'stage-4',
    stage: 4,
    points: 2500,
    title: 'Team Swag Kit',
    subtitle: '',
    badgeText: 'Stage 4',
    iconType: 'bag',
    unlocked: false,
    claimed: false,
    description: 'Complete incubation team apparel kit with custom embroidered canvas tote bag, tech accessories, and limited-run Arena swag.',
    perks: [
      'Heavyweight Embroidered Canvas Tote Bag',
      'Matte Black Arena Water Bottle (Insulated)',
      'Custom Laser-Cut Stainless Steel Keyring',
    ],
    redemptionLocation: 'Master Bedroom VIP Suite',
    xPercent: 55.2,
    yPercent: 56.4,
    side: 'right',
  },
  {
    id: 'stage-5',
    stage: 5,
    points: 4000,
    title: 'Mentor Session',
    subtitle: '',
    badgeText: 'Stage 5',
    iconType: 'users',
    unlocked: false,
    claimed: false,
    description: 'A 30-minute closed-door strategic advisory and pitch teardown session with guest venture partners and incubation mentors.',
    perks: [
      '30-Minute 1-on-1 VC & Founder Mentorship',
      'Pitch Deck & Architecture Review',
      'Angel Investor Syndicate Fast-Track',
    ],
    redemptionLocation: 'Incubation Executive Lounge',
    xPercent: 44.8,
    yPercent: 47.1,
    side: 'left',
  },
  {
    id: 'stage-6',
    stage: 6,
    points: 6000,
    title: 'Exclusive Merchandise',
    subtitle: '',
    badgeText: 'Stage 6',
    iconType: 'shirt',
    unlocked: false,
    claimed: false,
    description: 'Limited edition Arena Launch oversized heavyweight streetwear hoodie with gel-printed typography and individually numbered tag.',
    perks: [
      'Heavyweight 380gsm Jet-Black Boxy Hoodie',
      'Gel-Print Arena High-Density Monogram',
      'Individually Numbered Launch Edition Certificate',
    ],
    redemptionLocation: 'Hardware Prototyping Rig Area',
    xPercent: 55.2,
    yPercent: 37.8,
    side: 'right',
  },
  {
    id: 'stage-7',
    stage: 7,
    points: 10000,
    title: '10,000 Points',
    subtitle: '',
    badgeText: 'Stage 7',
    iconType: 'gold-coins',
    unlocked: false,
    claimed: false,
    description: 'Massive 10,000 bonus telemetry score boost catapulting your name into the All-Time Hall of Fame on the venue leaderboard.',
    perks: [
      '10,000 Telemetry Score Points',
      'Golden Glowing Border on Venue Projector',
      'Priority Microphone Access on Stage',
    ],
    redemptionLocation: 'Main Arena Stage Terminal',
    xPercent: 44.8,
    yPercent: 28.5,
    side: 'left',
  },
  {
    id: 'stage-8',
    stage: 8,
    points: 20000,
    title: 'Grand Prize',
    subtitle: 'VIP Incubation Access',
    badgeText: 'Stage 8',
    iconType: 'crown-chest',
    isGrandPrize: true,
    unlocked: false,
    claimed: false,
    description: 'The crowning achievement of the Arena launch event — guaranteed fast-track admission into the next startup incubation cohort and $1,000 seed grant.',
    perks: [
      'Guaranteed Admission into Incubation Cohort',
      '$1,000 Prototyping Grant Voucher',
      'Machined Brass & Acrylic Champion Monolith Trophy',
      'Permanent Hall of Fame Plaque in the Lab',
    ],
    redemptionLocation: 'Main Arena Stage Grand Ceremony',
    xPercent: 48.8,
    yPercent: 19.2,
    side: 'right',
  },
];

/**
 * Calculates user progression against the exact 8 stages
 */
export function calculatePrizeProgress(totalPoints = 300) {
  let currentStage = 2; // Default to Stage 2 (matching the image: Stage 2 of 8 • 300 / 1,000 PTS)
  let nextStage = PRIZE_STAGES[2]; // Stage 3 (1,000 PTS)

  for (let i = 0; i < PRIZE_STAGES.length; i++) {
    if (totalPoints >= PRIZE_STAGES[i].points) {
      currentStage = PRIZE_STAGES[i].stage;
      nextStage = PRIZE_STAGES[i + 1] || null;
    } else {
      nextStage = PRIZE_STAGES[i];
      break;
    }
  }

  const prevPoints = currentStage > 0 ? PRIZE_STAGES[currentStage - 1].points : 0;
  const nextTargetPoints = nextStage ? nextStage.points : PRIZE_STAGES[PRIZE_STAGES.length - 1].points;
  const segmentRange = Math.max(1, nextTargetPoints - prevPoints);
  const segmentProgress = Math.max(0, totalPoints - prevPoints);
  const progressPercent = nextStage
    ? Math.min(100, Math.max(10, Math.round((segmentProgress / segmentRange) * 100)))
    : 100;

  return {
    currentStage,
    totalStages: PRIZE_STAGES.length,
    currentPoints: totalPoints,
    nextTargetPoints,
    nextStage,
    progressPercent,
    isMaxStage: !nextStage || currentStage === PRIZE_STAGES.length,
  };
}
