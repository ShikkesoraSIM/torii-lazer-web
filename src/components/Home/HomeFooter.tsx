import { Link } from 'react-router-dom';

export default function HomeFooter() {
  return (
    <footer className="torii-home__footer">
      <div className="torii-home__footer-inner">
        <div>
          <p className="torii-home__footer-brand">Torii</p>
          <p>A community-run osu! server. Not affiliated with ppy.</p>
          <p>Built on osu! and g0v0, with thanks to their contributors.</p>
          <p className="torii-home__art-credit">Some art and default avatars on Torii are AI-assisted.</p>
        </div>
        <nav aria-label="About Torii">
          <Link to="/about">About Torii</Link>
          <a href="https://shikkesora.com" target="_blank" rel="noreferrer">shikkesora.com</a>
          <a href="https://lazer-api.shikkesora.com" target="_blank" rel="noreferrer">API</a>
        </nav>
      </div>
    </footer>
  );
}
