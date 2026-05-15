import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import AdminCountryPicker from './AdminCountryPicker';

// ─── Torii title definitions (mirrors g0v0-server/app/models/torii_groups.py) ──
//
// Kept aligned with TORII_GROUPS server-side. When adding a new group there:
// 1. add a matching entry below
// 2. set hasAura: true if torii_auras.py also has an entry whose
//    owning_groups contains this title's key (so admins know at a glance
//    which titles grant a particle aura, not just a badge).
// 3. set the appropriate `category` so the picker groups visually.
interface ToriiTitleDef {
  key: string
  label: string
  shortName: string
  colour: string
  category: 'staff' | 'mapping' | 'honorary' | 'cosmetic'
  isElite?: boolean
  hasAura?: boolean
}

const TORII_TITLES: ToriiTitleDef[] = [
  // Staff — gameplay moderation, server operations.
  { key: 'admin',         label: 'Torii Admin',        shortName: 'ADM', colour: '#FF3B3B', category: 'staff', isElite: true, hasAura: true },
  { key: 'dev',           label: 'Developer',          shortName: 'DEV', colour: '#00E5FF', category: 'staff', isElite: true, hasAura: true },
  { key: 'mod',           label: 'Moderator',          shortName: 'MOD', colour: '#4A90E2', category: 'staff', hasAura: true },
  { key: 'qat',           label: 'Quality Assurance',  shortName: 'QAT', colour: '#FFD700', category: 'staff', hasAura: true },
  // Mapping & competitive roles.
  { key: 'pooler',        label: 'Map Pooler',         shortName: 'MAP', colour: '#B24BF3', category: 'mapping' },
  { key: 'tournament',    label: 'Tournament Staff',   shortName: 'TRN', colour: '#3F51B5', category: 'mapping' },
  { key: 'advisor-osu',   label: 'osu! Advisor',       shortName: 'ADV', colour: '#FF66AA', category: 'mapping' },
  { key: 'advisor-taiko', label: 'Taiko Advisor',      shortName: 'ADV', colour: '#FF6B35', category: 'mapping' },
  { key: 'advisor-catch', label: 'Catch Advisor',      shortName: 'ADV', colour: '#26C6A6', category: 'mapping' },
  { key: 'advisor-mania', label: 'Mania Advisor',      shortName: 'ADV', colour: '#E91E8C', category: 'mapping' },
  // Honorary recognition.
  { key: 'alumni',        label: 'Alumni',             shortName: 'ALM', colour: '#9E9E9E', category: 'honorary' },
  { key: 'supporter',     label: 'Torii Supporter',    shortName: 'SUP', colour: '#FF7FC8', category: 'honorary', hasAura: true },
  // Cosmetic / community recognition. Free to assign, all carry an aura.
  // Goof and Bug Finder were missing from the picker — admins couldn't
  // grant them via the UI, only via a manual SQL update against
  // lazer_users.torii_titles. Adding them here closes that gap.
  { key: 'goof',          label: 'Goofball',           shortName: 'GOOF', colour: '#9CE5A0', category: 'cosmetic', hasAura: true },
  { key: 'bug-finder',    label: 'Bug Finder',         shortName: 'BUG', colour: '#8CE0C5', category: 'cosmetic', hasAura: true },
];

// Visual section labels in admin-panel order. donator is intentionally
// excluded — that group is auto-granted server-side from has_supported
// and has no manual admin action.
const TITLE_CATEGORY_LABELS: Record<ToriiTitleDef['category'], string> = {
  staff:    'Staff',
  mapping:  'Mapping & Competitive',
  honorary: 'Honorary',
  cosmetic: 'Cosmetic / Community',
};

const TITLE_CATEGORY_ORDER: ToriiTitleDef['category'][] = ['staff', 'mapping', 'honorary', 'cosmetic'];

interface AdminUserEditModalProps {
  user: User;
  // Note: the old `countries` prop has been removed. The country picker now
  // uses the canonical ISO 3166 list bundled in src/data/iso3166Countries.ts
  // instead of scraping the rankings (which only listed countries with at
  // least one ranked player and made many flags unselectable).
  onClose: () => void;
}

const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    country_code: user.country_code,
    is_qat: user.is_qat || false,
    is_gmt: user.is_gmt || false,
    is_admin: user.is_admin || false,
    selectedBadgeId: null as number | null,
    torii_titles: ((user as any).torii_titles as string[]) || [],
  });
  const [userBadges, setUserBadges] = useState<any[]>(user.badges || []);
  const [loading, setLoading] = useState(false);
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // ─── Manual supporter grant ──────────────────────────────────────────
  // Local state for the "Grant Supporter" sub-form. Kept separate from
  // the main `formData` because the grant is its own POST (calls the
  // dedicated /admin/users/{id}/grant-supporter endpoint) rather than
  // riding the PATCH that the main Save Changes button does — adding
  // months of supporter is a one-shot event, not a property being
  // edited, so it has its own button + loading state.
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantReason, setGrantReason] = useState('');
  const [grantingSupporter, setGrantingSupporter] = useState(false);

  useEffect(() => {
    loadBadges();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const loadBadges = async () => {
    try {
      setLoadingBadges(true);
      const badges = await adminAPI.getBadges();
      setAvailableBadges(badges || []);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleAddBadge = async () => {
    if (!formData.selectedBadgeId) return;
    
    const selectedBadge = availableBadges.find(b => b.id === formData.selectedBadgeId);
    if (!selectedBadge) return;

    try {
      setLoadingBadges(true);
      const newBadgeData = {
        description: selectedBadge.description,
        image_url: selectedBadge.image_url,
        image_2x_url: selectedBadge.image_2x_url || selectedBadge.image_url,
        url: selectedBadge.url || '',
        awarded_at: new Date().toISOString(),
        user_id: user.id
      };
      
      const createdBadge = await adminAPI.createBadge(newBadgeData);
      setUserBadges([...userBadges, createdBadge]);
      setFormData({ ...formData, selectedBadgeId: null });
      toast.success('Badge awarded successfully');
    } catch (error) {
      console.error('Failed to award badge:', error);
      toast.error('Failed to award badge');
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleRemoveBadge = async (badge: any) => {
    if (!badge.id) {
      // If it's a legacy badge (no ID), we can't delete it from DB
      // For now, just remove it from the list and we'll update the user later if needed
      // But actually, we should probably just filter it out
      setUserBadges(userBadges.filter(b => b !== badge));
      return;
    }

    if (!confirm('Are you sure you want to remove this badge?')) return;

    try {
      setLoadingBadges(true);
      await adminAPI.deleteBadge(badge.id);
      setUserBadges(userBadges.filter(b => b.id !== badge.id));
      toast.success('Badge removed successfully');
    } catch (error) {
      console.error('Failed to remove badge:', error);
      toast.error('Failed to remove badge');
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleGrantSupporter = async () => {
    // Defensive clamp — the input has min/max already but a paste or
    // a programmatic mutation could still slip something through.
    const months = Math.max(1, Math.min(120, Math.floor(grantMonths)));
    if (!Number.isFinite(months) || months < 1) {
      toast.error('Months must be a positive integer.');
      return;
    }

    // Explicit confirm because this is irreversible — the server does
    // NOT expose an "ungrant" endpoint (reversing donor_end_at
    // extensions / total_supporter_months decrements gets fiddly when
    // multiple grants stack), and an accidental "comp 12 months" is
    // way harder to walk back than to confirm here.
    const ok = window.confirm(
      `Grant ${months} month(s) of supporter to ${user.username}?\n\n`
      + `This sets is_supporter = true, extends donor_end_at by ${months * 30} days, `
      + `and increments total_supporter_months. It cannot be undone via the admin UI.`,
    );
    if (!ok) return;

    try {
      setGrantingSupporter(true);
      const result = await adminAPI.grantSupporter(user.id, {
        months,
        reason: grantReason.trim() || undefined,
      });
      toast.success(
        `Granted ${result.months_granted} month(s) to ${result.username}. `
        + `Total supporter months: ${result.total_supporter_months}. `
        + `User must log out + log in to see client-side gates unlock.`,
        { duration: 6000 },
      );
      setGrantMonths(1);
      setGrantReason('');
    } catch (error: any) {
      console.error('Failed to grant supporter:', error);
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to grant supporter.';
      toast.error(message);
    } finally {
      setGrantingSupporter(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        username: formData.username,
        country_code: formData.country_code?.trim() ? formData.country_code.trim().toUpperCase() : null,
        is_qat: formData.is_qat,
        is_gmt: formData.is_gmt,
        is_admin: formData.is_admin,
        torii_titles: formData.torii_titles,
      };

      await adminAPI.updateUser(user.id, updateData);
      toast.success('User updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to update user';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit User: {user.username}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country/Flag
              </label>
              <AdminCountryPicker
                value={formData.country_code}
                onChange={(value) => setFormData({ ...formData, country_code: value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_qat}
                  onChange={(e) => setFormData({ ...formData, is_qat: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">QAT</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_gmt}
                  onChange={(e) => setFormData({ ...formData, is_gmt: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GMT</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin</span>
              </label>
            </div>

            {/* ── Torii Titles ─────────────────────────────────────────────── */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex items-baseline justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Torii Titles
                </label>
                {/* Legend explaining the aura indicator on the right of the
                    section heading. Without this admins had to mentally map
                    "which titles also grant a particle aura" against the
                    server-side torii_auras catalog — confusing UX, and the
                    user explicitly asked us to normalise this. */}
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <span className="text-purple-400">✦</span> grants user aura
                </span>
              </div>

              {/* Render one block per category so the picker reads as
                  "staff, then mapping, then honorary, then cosmetic"
                  rather than a flat blur of identically-styled chips. */}
              {TITLE_CATEGORY_ORDER.map((category) => {
                const titlesInCategory = TORII_TITLES.filter((t) => t.category === category);
                if (titlesInCategory.length === 0) return null;

                return (
                  <div key={category} className="mb-3 last:mb-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 mb-1.5">
                      {TITLE_CATEGORY_LABELS[category]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {titlesInCategory.map((t) => {
                        const active = formData.torii_titles.includes(t.key);
                        const toggle = () => {
                          const next = active
                            ? formData.torii_titles.filter((k) => k !== t.key)
                            : [...formData.torii_titles, t.key];
                          setFormData({ ...formData, torii_titles: next });
                        };
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={toggle}
                            title={t.hasAura
                              ? `${t.label} — grants particle aura`
                              : t.label}
                            className={`
                              inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide
                              border transition-all duration-150 select-none
                              ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}
                            `}
                            style={{
                              color: t.colour,
                              borderColor: active ? `${t.colour}88` : `${t.colour}33`,
                              background: active ? `${t.colour}22` : `${t.colour}0a`,
                              boxShadow: active && t.isElite ? `0 0 8px ${t.colour}44` : undefined,
                            }}
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ background: t.colour, opacity: active ? 1 : 0.6 }}
                            />
                            {t.shortName}
                            <span className="font-normal normal-case tracking-normal text-[10px] opacity-75">
                              {t.label}
                            </span>
                            {/* ✦ marker for titles that also grant a
                                user aura (via torii_auras owning_groups).
                                Tiny purple sparkle so it doesn't visually
                                fight the per-title colour. */}
                            {t.hasAura && (
                              <span
                                className="text-purple-400 text-[11px] leading-none"
                                aria-label="grants user aura"
                              >
                                ✦
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {formData.torii_titles.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Active: {formData.torii_titles.join(', ')}
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manage Badges
              </label>
              
              <div className="space-y-2 mb-4">
                {userBadges.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No badges awarded yet</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {userBadges.map((badge, index) => (
                      <div key={badge.id || index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <img 
                            src={badge['image@2x_url'] || badge.image_url} 
                            alt={badge.description} 
                            className="w-8 h-8 object-contain"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{badge.description}</p>
                            <p className="text-xs text-gray-500">{new Date(badge.awarded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBadge(badge)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  value={formData.selectedBadgeId || ''}
                  onChange={(e) => setFormData({ ...formData, selectedBadgeId: e.target.value ? parseInt(e.target.value) : null })}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={loadingBadges}
                >
                  <option value="">Select a badge to award...</option>
                  {availableBadges.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.description}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddBadge}
                  disabled={!formData.selectedBadgeId || loadingBadges}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Award
                </button>
              </div>
            </div>

            {/* ── Grant Supporter ─────────────────────────────────────────────
                Manual supporter grant — calls the dedicated
                /admin/users/{id}/grant-supporter endpoint which routes
                through `apply_supporter_grant`, the same function the
                Ko-fi webhook and the donation match flow use. Adding
                the Supporter badge alone (above, via "Manage Badges")
                does NOT flip the supporter booleans the client checks
                for feature gating — this section is the proper path.
                Kept visually separate from "Save Changes" because the
                grant has its own POST and is irreversible. */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grant Supporter
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                Manually grant N months of supporter time. Sets <code className="text-pink-400">is_supporter</code> +{' '}
                <code className="text-pink-400">has_supported</code>, extends{' '}
                <code className="text-pink-400">donor_end_at</code> by 30×N days, and bumps the loyalty tier — identical
                effect to a real Ko-fi donation match. The user must <strong>log out and log back in</strong> for the
                client to refetch their <code className="text-pink-400">/me</code> cache and unlock supporter-gated
                features (UI accent hue picker, etc.).
              </p>

              <div className="flex flex-wrap items-end gap-2">
                <div className="w-24">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                    Months
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={grantMonths}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      setGrantMonths(Number.isFinite(parsed) ? Math.max(1, Math.min(120, parsed)) : 1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={grantingSupporter}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                    Reason (optional, audit log only)
                  </label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="e.g. comp for Ko-fi outage / fix-up for botched match #123"
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    disabled={grantingSupporter}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGrantSupporter}
                  disabled={grantingSupporter}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {grantingSupporter ? 'Granting…' : 'Grant'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminUserEditModal;

