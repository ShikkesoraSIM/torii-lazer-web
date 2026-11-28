export interface UserGroup {
  id: number
  identifier: string
  name: string
  short_name: string
  colour?: string
  has_playmodes?: boolean
  playmodes?: string[]
}

// ─── Tailwind + CSS custom-props badge ────────────────────────────────────────

interface TitleBadgeProps {
  group: UserGroup
  size?: 'sm' | 'md' | 'lg'
}

const PLAYMODE_ICONS: Record<string, string> = {
  osu: '●',
  taiko: '◎',
  fruits: '◈',
  mania: '▦',
}

export function TitleBadge({ group, size = 'md' }: TitleBadgeProps) {
  const rawColour = group.colour?.trim()
  const isWhite = !rawColour || /^#fff(?:fff)?$/i.test(rawColour)
  const colour = isWhite ? 'var(--torii-accent)' : rawColour

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-0.5',
    md: 'text-xs px-2.5 py-0.5 gap-1',
    lg: 'text-sm px-3 py-1 gap-1',
  }[size]

  // Glow pulse animation only for admin / dev
  const isElite =
    group.identifier === 'torii-admin' || group.identifier === 'torii-dev'

  return (
    <span
      title={group.name}
      className={`
        torii-badge rounded-full uppercase select-none shrink-0
        ${sizeClasses}
        ${isElite ? 'animate-title-glow' : ''}
      `}
      style={{
        color: `color-mix(in srgb, ${colour} 72%, var(--text-primary))`,
        borderColor: `color-mix(in srgb, ${colour} 45%, transparent)`,
        background: `color-mix(in srgb, ${colour} 18%, transparent)`,
        textShadow: isElite ? `0 0 8px color-mix(in srgb, ${colour} 50%, transparent)` : undefined,
        boxShadow: isElite ? `0 0 10px color-mix(in srgb, ${colour} 22%, transparent)` : undefined,
      }}
    >
      {group.short_name}
      {group.has_playmodes && group.playmodes?.map(pm => (
        <span key={pm} className="opacity-75 text-[9px]" title={pm}>
          {PLAYMODE_ICONS[pm] ?? pm}
        </span>
      ))}
    </span>
  )
}

// ─── Badge row (multiple groups) ─────────────────────────────────────────────

interface UserTitleBadgesProps {
  groups?: UserGroup[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserTitleBadges({ groups, size = 'md', className = '' }: UserTitleBadgesProps) {
  if (!groups || groups.length === 0) return null
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {groups.map((g, i) => (
        <TitleBadge key={`${g.id}-${i}`} group={g} size={size} />
      ))}
    </span>
  )
}
