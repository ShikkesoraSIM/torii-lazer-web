import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { beatmapAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { ExternalLink, Search } from 'lucide-react';

interface BeatmapUrlLoaderProps {
  onLoad?: (data: { beatmapset: any; beatmap?: any }) => void;
  className?: string;
}

const BeatmapUrlLoader: React.FC<BeatmapUrlLoaderProps> = ({ onLoad, className = '' }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const internalUrl = beatmapAPI.convertToInternalBeatmapUrl(url);
      
      if (internalUrl) {
        navigate(internalUrl);
      } else {
        const data = await beatmapAPI.getBeatmapFromUrl(url);
        
        if (onLoad) {
          onLoad(data);
        } else {
          const targetUrl = data.beatmap 
            ? `/beatmapsets/${data.beatmapset.id}#${data.beatmap.mode || 'osu'}/${data.beatmap.id}`
            : `/beatmapsets/${data.beatmapset.id}`;
          navigate(targetUrl);
        }
      }
      
      toast.success(t('beatmap.urlLoadSuccess'));
      setUrl('');
    } catch (error) {
      console.error('Failed to load beatmap from URL:', error);
      toast.error(t('beatmap.urlLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const isValidOsuUrl = (url: string) => {
    return url.includes('osu.ppy.sh') && (url.includes('/beatmaps/') || url.includes('/beatmapsets/'));
  };

  return (
    <div className={`card-standard overflow-hidden ${className}`}>
      <div className="px-6 py-4 bg-gradient-to-r from-osu-pink/10 to-transparent border-b border-white/10">
        <h3 className="font-heading text-lg font-semibold text-text-primary flex items-center gap-2">
          <ExternalLink size={20} className="text-osu-pink" />
          {t('beatmap.loadFromUrl')}
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="beatmap-url" className="block text-sm font-medium text-text-secondary mb-2">
            {t('beatmap.urlPlaceholder')}
          </label>
          <div className="relative">
            <input
              id="beatmap-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://osu.ppy.sh/beatmapsets/123456#osu/789012"
              className="w-full px-4 py-3 pl-10 pr-12 border border-white/10 rounded-xl 
                        bg-[#0d122c]/80 text-text-primary
                        focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50
                        placeholder:text-text-muted
                        transition-all"
              disabled={loading}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
            {isValidOsuUrl(url) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className="w-full px-4 py-3 bg-osu-pink hover:bg-osu-pink/90 disabled:opacity-50 disabled:cursor-not-allowed
                    text-white font-semibold rounded-xl transition-all shadow-elev-1 hover:shadow-elev-2
                    flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {t('beatmap.loading')}
            </>
          ) : (
            <>
              <Search size={16} />
              {t('beatmap.loadBeatmap')}
            </>
          )}
        </button>
      </form>
      
      <div className="px-6 pb-6 text-sm text-text-secondary">
        <p className="mb-2 font-medium">{t('beatmap.supportedUrls')}:</p>
        <ul className="space-y-1.5 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-osu-pink mt-0.5">●</span>
            <code className="flex-1 bg-white/5 border border-white/10 px-2 py-1 rounded">https://osu.ppy.sh/beatmapsets/123456</code>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-osu-pink mt-0.5">●</span>
            <code className="flex-1 bg-white/5 border border-white/10 px-2 py-1 rounded">https://osu.ppy.sh/beatmapsets/123456#osu/789012</code>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-osu-pink mt-0.5">●</span>
            <code className="flex-1 bg-white/5 border border-white/10 px-2 py-1 rounded">https://osu.ppy.sh/beatmaps/789012</code>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BeatmapUrlLoader;
