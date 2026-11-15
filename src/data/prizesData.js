/**
 * Official Arena Prize Road & Milestone Progression Data
 *
 * Modeled after AAA Mobile Game Trophy Roads / Battle Passes (Candy Crush, Brawl Stars),
 * climbing from Stage 1 (Bottom Entrance) up to Stage 8 (Peak Champion Summit).
 */

export const PRIZE_STAGES = [
  {
    id: 'prize-stage-1',
    stage: 1,
    points: 100,
    title: 'Initiate VIP Welcome Kit',
    subtitle: 'Incubation Lab Onboarding',
    rarity: 'STARTER',
    rarityColor: '#0ea5e9', // Sky
    gemColor: 'amber',
    iconType: 'ticket',
    badgeText: 'Stage 1 • 100 PTS',
    description: 'Claim your official Arena attendee starter gear right after completing your first check-in.',
    perks: [
      'Official Arena Holographic Decal Pack',
      'High-Density NFC VIP Attendee Lanyard',
      'Initial 100 Player Telemetry Points',
    ],
    redemptionLocation: 'Lab Entry Porch / Reception Desk',
    xPercent: 32, // Left
  },
  {
    id: 'prize-stage-2',
    stage: 2,
    points: 250,
    title: 'Barista Cold Brew & Snack',
    subtitle: 'Refuel Station Reward',
    rarity: 'COMMON',
    rarityColor: '#10b981', // Emerald
    gemColor: 'emerald',
    iconType: 'coffee',
    badgeText: 'Stage 2 • 250 PTS',
    description: 'Keep your energy high with handcrafted beverages and energy snacks from the incubation kitchen.',
    perks: [
      'Single handcrafted Nitro Cold Brew or Artisan Espresso',
      'Superfood Protein Energy Bar',
      'Exclusive Kitchen QR Bonus Points',
    ],
    redemptionLocation: 'Kitchen Refuel Station Counter',
    xPercent: 68, // Right
  },
  {
    id: 'prize-stage-3',
    stage: 3,
    points: 500,
    title: 'IoT Prototyper Hardware Rig',
    subtitle: 'Hardware Showcase Bounty',
    rarity: 'RARE',
    rarityColor: '#6366f1', // Indigo
    gemColor: 'sapphire',
    iconType: 'hardware',
    badgeText: 'Stage 3 • 500 PTS',
    description: 'Hands-on developer hardware kit assembled by our inaugural incubation engineering cohort.',
    perks: [
      'Custom Arena ESP32-C3 Wi-Fi/BLE Microcontroller Board',
      'Breadboard Sensor Expansion Pack (OLED + IMU Sensors)',
      'Live IoT Rig Testing Telemetry Access',
    ],
    redemptionLocation: 'Bedroom 3 Hardware Lab Rig',
    xPercent: 28, // Left
  },
  {
    id: 'prize-stage-4',
    stage: 4,
    points: 800,
    title: "Founder's Cipher Black Tee",
    subtitle: 'Secret Enigma Merch',
    rarity: 'RARE',
    rarityColor: '#a855f7', // Purple
    gemColor: 'amethyst',
    iconType: 'shirt',
    badgeText: 'Stage 4 • 800 PTS',
    description: 'Exclusive heavyweight jet-black Arena Incubation Launch edition oversized apparel.',
    perks: [
      'Heavyweight 280gsm 100% Cotton Boxy Cut',
      'Subtle High-Density Gel Print Arena Wordmark',
      'Individually Numbered Launch Edition Tag',
    ],
    redemptionLocation: 'Master Bedroom VIP Terminal',
    xPercent: 72, // Right
  },
  {
    id: 'prize-stage-5',
    stage: 5,
    points: 1200,
    title: 'VIP Duelist Arena Fast-Pass',
    subtitle: 'Main Stage Privilege',
    rarity: 'EPIC',
    rarityColor: '#f59e0b', // Amber / Gold
    gemColor: 'ruby',
    iconType: 'crown',
    badgeText: 'Stage 5 • 1,200 PTS',
    description: 'Commanding front-row arena status for the live startup demo duels and pitch battles.',
    perks: [
      'Guaranteed Front-Row Reserved Duelist Seating',
      '+1,000 Live Arena Crowd Voting Tokens',
      'Priority Microphone Access during Q&A Rounds',
    ],
    redemptionLocation: 'Main Arena Stage Lounge',
    xPercent: 30, // Left
  },
  {
    id: 'prize-stage-6',
    stage: 6,
    points: 1600,
    title: '1-on-1 VC & Startup Advisory',
    subtitle: 'Investor Strategy Session',
    rarity: 'EPIC',
    rarityColor: '#ec4899', // Pink / Rose
    gemColor: 'amethyst',
    iconType: 'brain',
    badgeText: 'Stage 6 • 1,600 PTS',
    description: 'Private 30-minute strategic pitch and product architecture review with guest incubation venture mentors.',
    perks: [
      '30-Minute Closed-Door Founder Advisory Session',
      'Direct Pitch Deck & Architecture Teardown',
      'Warm Investor Syndicate Introductions',
    ],
    redemptionLocation: 'VIP Mentorship Suite',
    xPercent: 70, // Right
  },
  {
    id: 'prize-stage-7',
    stage: 7,
    points: 2200,
    title: 'Studio Wireless Audio Monitor',
    subtitle: 'Top Tier Telemetry Bounty',
    rarity: 'LEGENDARY',
    rarityColor: '#06b6d4', // Cyan
    gemColor: 'diamond',
    iconType: 'headphones',
    badgeText: 'Stage 7 • 2,200 PTS',
    description: 'High-fidelity wireless active noise-cancelling earbuds featuring precision laser-engraved Arena branding.',
    perks: [
      'Hybrid Active Noise Cancellation with Transparency Mode',
      'Laser-Etched Arena Monogram Charging Case',
      'Low-Latency Gaming & Audio DSP Architecture',
    ],
    redemptionLocation: 'Incubation Executive Office',
    xPercent: 32, // Left
  },
  {
    id: 'prize-stage-8',
    stage: 8,
    points: 3000,
    title: 'Grand Champion Monolith & $500 Grant',
    subtitle: 'The Ultimate Incubation Summit',
    rarity: 'MYTHIC GRAND PRIZE',
    rarityColor: '#eab308', // Pure Gold
    gemColor: 'gold',
    iconType: 'trophy',
    badgeText: 'Stage 8 • 3,000 PTS (PEAK)',
    description: 'The crowning achievement of the Arena launch event — awarded to attendees who conquer the highest milestone.',
    perks: [
      'Machined Brass & Smoked Acrylic Champion Monolith Trophy',
      '$500 Non-Dilutive Tech Prototyping Grant Voucher',
      'Permanent Hall of Fame Inductee Plaque in the Lab',
      'Direct Finalist Fast-Track for Next Accelerator Cohort',
    ],
    redemptionLocation: 'Main Arena Stage Grand Ceremony',
    xPercent: 50, // Center Summit
  },
];

/**
 * Computes current prize progression details based on total player points:
 * - currentStage: the highest completed stage (or 0 if none)
 * - nextStage: the upcoming target stage (or null if max reached)
 * - pointsToNext: number of points remaining to unlock next stage
 * - progressPercent: percentage (0-100) toward the next stage
 */
export function calculatePrizeProgress(totalPoints = 0) {
  let currentStage = 0;
  let nextStage = PRIZE_STAGES[0];

  for (let i = 0; i < PRIZE_STAGES.length; i++) {
    if (totalPoints >= PRIZE_STAGES[i].points) {
      currentStage = PRIZE_STAGES[i].stage;
      nextStage = PRIZE_STAGES[i + 1] || null;
    } else {
      nextStage = PRIZE_STAGES[i];
      break;
    }
  }

  const prevThreshold = currentStage > 0 ? PRIZE_STAGES[currentStage - 1].points : 0;
  const nextThreshold = nextStage ? nextStage.points : PRIZE_STAGES[PRIZE_STAGES.length - 1].points;
  const segmentRange = Math.max(1, nextThreshold - prevThreshold);
  const pointsInSegment = Math.max(0, totalPoints - prevThreshold);
  const progressPercent = nextStage
    ? Math.min(100, Math.round((pointsInSegment / segmentRange) * 100))
    : 100;

  const pointsToNext = nextStage ? Math.max(0, nextStage.points - totalPoints) : 0;

  return {
    currentStage,
    nextStage,
    pointsToNext,
    progressPercent,
    isMaxStage: !nextStage || currentStage === PRIZE_STAGES.length,
  };
}
