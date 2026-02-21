import React, { useMemo } from 'react';
import { Tooltip } from 'react-tooltip';

interface UserAchievement {
  achievement_id: number;
  achieved_at: string;
}

interface AchievementsProps {
  userAchievements?: UserAchievement[] | unknown[];
}

// Comprehensive achievement data from backend
const ACHIEVEMENTS: Record<number, { name: string; description: string; assets_id: string; category: string }> = {
  // Skill-based achievements (Skill & Dedication)
  1: { name: 'Rising Star', description: "Can't go forward without the first steps.", assets_id: 'osu-skill-pass-1', category: 'Skill & Dedication' },
  2: { name: 'Constellation Prize', description: 'Definitely not a consolation prize. Now things start getting hard!', assets_id: 'osu-skill-pass-2', category: 'Skill & Dedication' },
  3: { name: 'Building Confidence', description: "Oh, you've SO got this.", assets_id: 'osu-skill-pass-3', category: 'Skill & Dedication' },
  4: { name: 'Insanity Approaches', description: "You're not twitching, you're just ready.", assets_id: 'osu-skill-pass-4', category: 'Skill & Dedication' },
  5: { name: 'These Clarion Skies', description: 'Everything seems so clear now.', assets_id: 'osu-skill-pass-5', category: 'Skill & Dedication' },
  6: { name: 'Above and Beyond', description: 'A cut above the rest.', assets_id: 'osu-skill-pass-6', category: 'Skill & Dedication' },
  7: { name: 'Supremacy', description: 'All marvel before your prowess.', assets_id: 'osu-skill-pass-7', category: 'Skill & Dedication' },
  8: { name: 'Absolution', description: "My god, you're full of stars!", assets_id: 'osu-skill-pass-8', category: 'Skill & Dedication' },
  9: { name: 'Event Horizon', description: 'No force dares to pull you under.', assets_id: 'osu-skill-pass-9', category: 'Skill & Dedication' },
  10: { name: 'Phantasm', description: 'Fevered is your passion, extraordinary is your skill.', assets_id: 'osu-skill-pass-10', category: 'Skill & Dedication' },
  11: { name: 'Totality', description: 'All the notes. Every single one.', assets_id: 'osu-skill-fc-1', category: 'Skill & Dedication' },
  12: { name: 'Business As Usual', description: 'Two to go, please.', assets_id: 'osu-skill-fc-2', category: 'Skill & Dedication' },
  13: { name: 'Building Steam', description: "Hey, this isn't so bad.", assets_id: 'osu-skill-fc-3', category: 'Skill & Dedication' },
  14: { name: 'Moving Forward', description: 'How are you even so good?', assets_id: 'osu-skill-fc-4', category: 'Skill & Dedication' },
  15: { name: 'Paradigm Shift', description: 'Something about a stream of cores, I guess.', assets_id: 'osu-skill-fc-5', category: 'Skill & Dedication' },
  16: { name: 'Accuracy', description: 'Couldn\'t they just not?', assets_id: 'osu-skill-fc-6', category: 'Skill & Dedication' },
  17: { name: 'Ascension', description: 'New speed, new you!', assets_id: 'osu-skill-fc-7', category: 'Skill & Dedication' },
  18: { name: 'Tremolo', description: 'You\'re not just mashing; you\'re farming.', assets_id: 'osu-skill-fc-8', category: 'Skill & Dedication' },
  19: { name: 'Mach', description: 'The speedy hands speak for themselves.', assets_id: 'osu-skill-fc-9', category: 'Skill & Dedication' },
  20: { name: 'Ren\'ai Syndrome', description: 'All the streaming glory and nothing more.', assets_id: 'osu-skill-fc-10', category: 'Skill & Dedication' },
  
  // Combo achievements
  21: { name: '500 Combo', description: "500 big ones! You're moving up in the world!", assets_id: 'osu-combo-500', category: 'Combo Milestones' },
  22: { name: '750 Combo', description: '750 notes back to back? Woah.', assets_id: 'osu-combo-750', category: 'Combo Milestones' },
  23: { name: '1000 Combo', description: 'A thousand reasons why you rock at this game.', assets_id: 'osu-combo-1000', category: 'Combo Milestones' },
  24: { name: '2000 Combo', description: 'Two thousand times you\'ve clicked your way to glory!', assets_id: 'osu-combo-2000', category: 'Combo Milestones' },
  
  // Mod introduction achievements
  89: { name: 'Finality', description: 'High stakes, no regrets.', assets_id: 'all-intro-suddendeath', category: 'Mod Introduction' },
  90: { name: 'Perfectionist', description: 'Accept nothing but the best.', assets_id: 'all-intro-perfect', category: 'Mod Introduction' },
  91: { name: 'Rock Around The Clock', description: "You can't stop the rock.", assets_id: 'all-intro-hardrock', category: 'Mod Introduction' },
  92: { name: 'Time And A Half', description: 'Having a right ol\' time. One and a half of them, almost.', assets_id: 'all-intro-doubletime', category: 'Mod Introduction' },
  93: { name: 'Sweet Rave Party', description: 'Founded in the fine tradition of changing things that were just fine as they were.', assets_id: 'all-intro-nightcore', category: 'Mod Introduction' },
  94: { name: 'Blindsight', description: 'I can see just perfectly.', assets_id: 'all-intro-hidden', category: 'Mod Introduction' },
  95: { name: 'Are You Afraid Of The Dark?', description: "Harder than it looks, probably because it's hard to look.", assets_id: 'all-intro-flashlight', category: 'Mod Introduction' },
  96: { name: 'Dial It Right Back', description: 'Sometimes you just want to take it easy.', assets_id: 'all-intro-easy', category: 'Mod Introduction' },
  97: { name: 'Risk Averse', description: 'Safety nets are fun!', assets_id: 'all-intro-nofail', category: 'Mod Introduction' },
  98: { name: 'Slowboat', description: 'You got there. Eventually.', assets_id: 'all-intro-halftime', category: 'Mod Introduction' },
  99: { name: 'Burned Out', description: 'One cannot always spin to win.', assets_id: 'all-intro-spunout', category: 'Mod Introduction' },
  100: { name: 'Gear Shift', description: 'Tailor your experience to your perfect fit.', assets_id: 'all-intro-conversion', category: 'Mod Introduction' },
  101: { name: 'Game Night', description: "Mum said it's my turn with the beatmap!", assets_id: 'all-intro-fun', category: 'Mod Introduction' },
  
  // Secret achievements (Hush-Hush)
  105: { name: 'Jackpot', description: 'Lucky sevens is a mild understatement.', assets_id: 'all-secret-jackpot', category: 'Hush-Hush' },
  106: { name: 'Nonstop', description: 'Breaks? What are those?', assets_id: 'all-secret-nonstop', category: 'Hush-Hush' },
  107: { name: 'Time Dilation', description: 'Longer is shorter when all is said and done.', assets_id: 'all-secret-tidi', category: 'Hush-Hush' },
  108: { name: 'To The Core', description: 'In for a penny, in for a pound. Pounding bass, that is.', assets_id: 'all-secret-tothecore', category: 'Hush-Hush' },
  109: { name: 'When You See It', description: 'Three numbers which will haunt you forevermore.', assets_id: 'all-secret-when-you-see-it', category: 'Hush-Hush' },
  110: { name: 'Prepared', description: 'Do it for real next time.', assets_id: 'all-secret-prepared', category: 'Hush-Hush' },
  111: { name: 'Reckless Abandon', description: 'Throw it all to the wind.', assets_id: 'all-secret-reckless', category: 'Hush-Hush' },
  112: { name: 'Lights Out', description: "The party's just getting started.", assets_id: 'all-secret-lightsout', category: 'Hush-Hush' },
  113: { name: 'Camera Shy', description: 'Stop being cute.', assets_id: 'all-secret-uguushy', category: 'Hush-Hush' },
  114: { name: 'The Sun of All Fears', description: 'Unfortunate.', assets_id: 'all-secret-nuked', category: 'Hush-Hush' },
  115: { name: 'Hour Before The Down', description: 'Eleven skies of everlasting sunrise.', assets_id: 'all-secret-hourbeforethedawn', category: 'Hush-Hush' },
  116: { name: 'Slow And Steady', description: 'Win the race, or start again.', assets_id: 'all-secret-slowandsteady', category: 'Hush-Hush' },
  117: { name: 'No Time To Spare', description: 'Places to be, things to do.', assets_id: 'all-secret-ntts', category: 'Hush-Hush' },
  118: { name: 'Sognare', description: 'A dream in stop-motion, soon forever gone.', assets_id: 'all-secret-sognare', category: 'Hush-Hush' },
  119: { name: 'Realtor Extraordinaire', description: 'An acre-wide stride.', assets_id: 'all-secret-realtor', category: 'Hush-Hush' },
  120: { name: 'Impeccable', description: 'Speed matters not to the exemplary.', assets_id: 'all-secret-impeccable', category: 'Hush-Hush' },
  121: { name: 'Aeon', description: 'In the mire of thawing time, memory shall be your guide.', assets_id: 'all-secret-aeon', category: 'Hush-Hush' },
  122: { name: 'Quick Maths', description: "Beats per minute over... this isn't quick at all!", assets_id: 'all-secret-quickmaffs', category: 'Hush-Hush' },
  123: { name: 'Kaleidoscope', description: 'So many pretty colours. Most of them red.', assets_id: 'all-secret-kaleidoscope', category: 'Hush-Hush' },
  124: { name: 'Valediction', description: 'One last time.', assets_id: 'all-secret-valediction', category: 'Hush-Hush' },
  127: { name: 'Right On Time', description: 'The first minute is always the hardest.', assets_id: 'all-secret-rightontime', category: 'Hush-Hush' },
  128: { name: 'Not Again', description: 'Regret everything.', assets_id: 'all-secret-notagain', category: 'Hush-Hush' },
  129: { name: 'Deliberation', description: 'The challenge remains.', assets_id: 'all-secret-deliberation', category: 'Hush-Hush' },
  130: { name: 'Clarity', description: 'And yet in our memories, you remain crystal clear.', assets_id: 'all-secret-clarity', category: 'Hush-Hush' },
  131: { name: 'Autocreation', description: 'Absolute rule.', assets_id: 'all-secret-autocreation', category: 'Hush-Hush' },
  132: { name: 'Value Your Identity', description: 'As perfect as you are.', assets_id: 'all-secret-identity', category: 'Hush-Hush' },
  133: { name: 'By The Skin Of The Teeth', description: "You're that accurate.", assets_id: 'all-secret-skinoftheteeth', category: 'Hush-Hush' },
  134: { name: 'Meticulous Mayhem', description: "How did we get here?", assets_id: 'all-secret-meticulousmayhem', category: 'Hush-Hush' },
};

const AchievementMedal: React.FC<{
  achievementId: number;
  achieved: boolean;
  achievedAt?: string;
}> = ({ achievementId, achieved, achievedAt }) => {
  const ach = ACHIEVEMENTS[achievementId];
  if (!ach) return null;

  const tooltipId = `ach-${achievementId}`;
  const awardedDate = achievedAt ? new Date(achievedAt).toLocaleDateString() : '';
  const imageUrl = `https://assets.ppy.sh/medals/client/${ach.assets_id}@2x.png`;

  return (
    <div className="relative">
      <button
        className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-lg transition-all duration-200 cursor-help overflow-hidden ${
          achieved
            ? 'hover:scale-110 filter drop-shadow-md hover:drop-shadow-lg'
            : 'opacity-40 grayscale hover:opacity-60'
        }`}
        data-tooltip-id={tooltipId}
        data-tooltip-content={`${ach.name}${awardedDate ? '\n' + awardedDate : ''}`}
      >
        <img
          src={imageUrl}
          alt={ach.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </button>
      <Tooltip id={tooltipId} place="top" style={{ maxWidth: '220px', padding: '8px 12px' }} />
    </div>
  );
};

const Achievements: React.FC<AchievementsProps> = ({ userAchievements = [] }) => {
  const normalizedAchievements: UserAchievement[] = Array.isArray(userAchievements)
    ? userAchievements.filter(
      (a): a is UserAchievement =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as UserAchievement).achievement_id === 'number' &&
        typeof (a as UserAchievement).achieved_at === 'string',
    )
    : [];

  const achievedIds = new Set(normalizedAchievements.map((a) => a.achievement_id));
  const achievedMap = new Map(normalizedAchievements.map((a) => [a.achievement_id, a.achieved_at]));

  // Get all available achievement IDs
  const allIds = Object.keys(ACHIEVEMENTS).map(Number).sort((a, b) => a - b);

  // Group by category
  const categories = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    for (const id of allIds) {
      const ach = ACHIEVEMENTS[id];
      if (!grouped[ach.category]) grouped[ach.category] = [];
      grouped[ach.category].push(id);
    }
    return grouped;
  }, [allIds]);

  // Get latest 3 achieved
  const latestAchieved = useMemo(() => {
    return [...normalizedAchievements]
      .sort((a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime())
      .slice(0, 3);
  }, [normalizedAchievements]);

  return (
    <div className="w-full space-y-6">
      {/* Latest Section */}
      {latestAchieved.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Latest</h3>
          <div className="flex flex-wrap gap-3">
            {latestAchieved.map((ach, idx: number) => (
              <AchievementMedal
                key={`latest-${idx}`}
                achievementId={ach.achievement_id}
                achieved={true}
                achievedAt={ach.achieved_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(categories).map(([category, ids]) => (
          <div key={category} className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 tracking-wide">
              {category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => (
                <AchievementMedal
                  key={`${category}-${id}`}
                  achievementId={id}
                  achieved={achievedIds.has(id)}
                  achievedAt={achievedMap.get(id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;

