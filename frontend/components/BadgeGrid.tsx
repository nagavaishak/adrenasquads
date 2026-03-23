interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: React.ReactNode;
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  champion: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3L17.5 10.5H25L19 15.5L21.5 23L14 18.5L6.5 23L9 15.5L3 10.5H10.5L14 3Z"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    </svg>
  ),
  streak: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 4C14 4 8 10 8 16.5C8 20.09 10.69 23 14 23C17.31 23 20 20.09 20 16.5C20 10 14 4 14 4Z"
        stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M14 13C14 13 11.5 15.3 11.5 17.5C11.5 18.88 12.62 20 14 20C15.38 20 16.5 18.88 16.5 17.5C16.5 15.3 14 13 14 13Z"
        fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  diamond: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <polygon points="14,4 24,12 14,24 4,12"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <polygon points="14,8 21,12 14,20 7,12"
        stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinejoin="round" opacity="0.5"/>
      <line x1="4" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
    </svg>
  ),
  perfect: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <polyline points="9,14 12.5,17.5 19,10.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  builder: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="7"  cy="20" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="21" cy="20" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <line x1="14" y1="12" x2="14" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
      <line x1="14" y1="17" x2="7" y2="17.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
      <line x1="14" y1="17" x2="21" y2="17.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
    </svg>
  ),
  oracle: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <circle cx="14" cy="14" r="1.5" fill="currentColor" opacity="0.7"/>
      <line x1="14" y1="4" x2="14" y2="7"   stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
      <line x1="14" y1="21" x2="14" y2="24" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
      <line x1="4" y1="14" x2="7" y2="14"   stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
      <line x1="21" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
    </svg>
  ),
};

const BADGES: Badge[] = [
  {
    id: "champion",
    name: "Squad Champion",
    description: "Win a full season championship",
    unlocked: false,
    icon: BADGE_ICONS.champion,
  },
  {
    id: "streak",
    name: "Hot Streak",
    description: "Top 3 finish in 3 consecutive rounds",
    unlocked: true,
    icon: BADGE_ICONS.streak,
  },
  {
    id: "diamond",
    name: "Diamond Hands",
    description: "All members profitable in a round",
    unlocked: true,
    icon: BADGE_ICONS.diamond,
  },
  {
    id: "perfect",
    name: "Perfect Round",
    description: "Squad ranks #1 in a competition round",
    unlocked: false,
    icon: BADGE_ICONS.perfect,
  },
  {
    id: "builder",
    name: "Squad Builder",
    description: "Leader with a squad that finishes top 10",
    unlocked: true,
    icon: BADGE_ICONS.builder,
  },
  {
    id: "oracle",
    name: "Oracle",
    description: "Correctly predicted the winner 3 times",
    unlocked: false,
    icon: BADGE_ICONS.oracle,
  },
];

interface Props {
  unlockedIds?: string[];
}

export default function BadgeGrid({ unlockedIds }: Props) {
  const badges = unlockedIds
    ? BADGES.map((b) => ({ ...b, unlocked: unlockedIds.includes(b.id) }))
    : BADGES;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
      }}
    >
      {badges.map((badge) => (
        <div
          key={badge.id}
          title={badge.description}
          style={{
            border: badge.unlocked
              ? "1px solid rgba(249,115,22,0.3)"
              : "1px solid var(--border)",
            borderRadius: 4,
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            backgroundColor: badge.unlocked ? "var(--accent-dim)" : "var(--surface)",
            opacity: badge.unlocked ? 1 : 0.45,
            cursor: "default",
            transition: "opacity 0.2s",
          }}
        >
          <div
            style={{
              color: badge.unlocked ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {badge.icon}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: badge.unlocked ? 500 : 400,
              color: badge.unlocked ? "var(--text)" : "var(--text-muted)",
              textAlign: "center",
              letterSpacing: "0.02em",
              lineHeight: 1.3,
            }}
          >
            {badge.name}
          </div>
        </div>
      ))}
    </div>
  );
}
