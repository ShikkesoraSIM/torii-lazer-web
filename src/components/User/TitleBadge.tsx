import React from 'react'

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
  taiko: '太',
  fruits: '◈',
  mania: '▦',
}

export function TitleBadge({ group, size = 'md' }: TitleBadgeProps) {
  const colour = group.colour ?? '#ffffff'

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  }[size]

  // Glow pulse animation only for admin / dev
  const isElite =
    group.identifier === 'torii-admin' || group.identifier === 'torii-dev'

  return (
    <span
      title={group.name}
      className={`
        inline-flex items-center rounded font-bold uppercase tracking-wide
        border select-none shrink-0
        ${sizeClasses}
        ${isElite ? 'animate-title-glow' : ''}
      `}
      style={{
        color: colour,
        borderColor: `${colour}55`,
        background: `${colour}18`,
        textShadow: isElite ? `0 0 8px ${colour}99` : undefined,
        boxShadow: isElite ? `0 0 10px ${colour}33` : undefined,
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
