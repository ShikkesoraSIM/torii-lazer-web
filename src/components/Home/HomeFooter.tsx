import React from 'react';

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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
