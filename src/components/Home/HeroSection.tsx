import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, Files, Map, MousePointer2, Palette, SlidersHorizontal, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const shortcuts = [
  { to: '/rankings', label: 'nav.rankings', icon: TrendingUp },
  { to: '/teams', label: 'nav.teams', icon: Users },
  { to: '/beatmaps', label: 'hero.beatmaps', icon: Map },
  { to: '/how-to-join', label: 'hero.setupGuide', icon: BookOpen },
];

const featureIcons = [Files, SlidersHorizontal, Palette, MousePointer2];

export default function HeroSection() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <section className="torii-home__hero" aria-labelledby="torii-home-title">
        <img
          className="torii-home__image"
          src="/image/home/torii-lake.webp"
          alt=""
          width={1920}
          height={800}
          fetchPriority="high"
        />
        <div className="torii-home__content">
          <div className="torii-home__server-label">osu!lazer private server</div>
          <div className="torii-home__brand-mark">
            <img
              src="/image/logos/logo.png"
              srcSet="/image/logos/logo.png 1x, /image/logos/logo@2x.png 2x"
              width={72}
              height={72}
              alt=""
              draggable={false}
            />
          </div>
          <h1 id="torii-home-title">Torii</h1>
          <a className="torii-home__dojo" href="https://shikkesora.com" target="_blank" rel="noreferrer">
            forged in Shikke's Dojo
          </a>
          <p className="torii-home__tagline">{t('hero.tagline')}</p>
          <p className="torii-home__description">{t('hero.description')}</p>

          <div className="torii-home__actions">
            <Link className="torii-home__button" to={isAuthenticated ? '/profile' : '/register'}>
              {t(isAuthenticated ? 'hero.viewProfile' : 'hero.joinCta')}
            </Link>
            <Link className="torii-home__button torii-home__button--secondary" to={isAuthenticated ? '/rankings' : '/how-to-join'}>
              {t(isAuthenticated ? 'hero.viewRankings' : 'hero.setupGuide')}
            </Link>
            <a className="torii-home__button torii-home__button--secondary" href="https://discord.gg/fZXsZFT5Xv" target="_blank" rel="noreferrer">
              Discord
            </a>
          </div>
        </div>
      </section>

      <nav className="torii-home__shortcuts" aria-label={t('hero.explore')}>
        {shortcuts.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Icon size={19} aria-hidden="true" />
            <span>{t(label)}</span>
          </Link>
        ))}
      </nav>

      <section className="torii-home__features" aria-labelledby="torii-home-features">
        <h2 id="torii-home-features" className="sr-only">{t('hero.featuresTitle')}</h2>
        <div className="torii-home__feature-list">
          {featureIcons.map((Icon, index) => (
            <div className="torii-home__feature" key={index}>
              <Icon size={22} aria-hidden="true" />
              <h3>{t(`features.items.${index}.title`)}</h3>
              <p>{t(`features.items.${index}.content`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
