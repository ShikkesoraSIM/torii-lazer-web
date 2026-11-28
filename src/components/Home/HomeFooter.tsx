import { Link } from 'react-router-dom';

export default function HomeFooter() {
  return (
    <footer className="torii-home__footer">
      <div className="torii-home__footer-inner">
        <div>
          <p className="torii-home__footer-brand">Torii</p>
          <p>A community-run rhythm game server. Not affiliated with, endorsed by, or supported by ppy Pty Ltd.</p>
          <p>Built with osu-framework and g0v0, with thanks to open-source contributors.</p>
          <p className="torii-home__art-credit">Some art and default avatars on Torii are AI-assisted.</p>
        </div>
        <nav aria-label="Footer resources">
          <Link to="/about">About Torii</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <a href="https://shikkesora.com" target="_blank" rel="noreferrer">shikkesora.com</a>
          <a href="https://lazer-api.shikkesora.com" target="_blank" rel="noreferrer">API</a>
        </nav>
      </div>
    </footer>
  );
}
