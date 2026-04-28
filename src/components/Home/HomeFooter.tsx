import React from 'react';
import { FiHeart } from 'react-icons/fi';

// Public Ko-fi page — kept inline so the footer stays self-contained.
// If the URL changes, also update SupportButton.tsx (the navbar heart).
const KOFI_URL = 'https://ko-fi.com/shikkesora';

const HomeFooter: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-white/60">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-white/75 font-semibold">Shikkesora lazer server</div>
            <div className="mt-1">Not affiliated with ppy. Community-run private server.</div>
          </div>

          <div className="flex items-center gap-4">
            <a className="hover:text-white transition" href="https://shikkesora.com" target="_blank" rel="noreferrer">
              shikkesora.com
            </a>
            <a className="hover:text-white transition" href="https://lazer-api.shikkesora.com" target="_blank" rel="noreferrer">
              API
            </a>
            {/* Quiet supporter heart — same affordance as the navbar pill,
                here so the footer also has a low-key route to the Ko-fi
                page for anyone scrolling to the bottom of the home view. */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[#ff7eb8] hover:text-[#ffb3d9] transition"
              aria-label="Support Torii on Ko-fi"
              title="Support Torii on Ko-fi"
            >
              <FiHeart size={14} fill="currentColor" />
              <span>Support</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
