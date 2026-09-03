import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { getPublicNews, fetchPublicNews, type NewsItem } from '@/newsStore';
import type { NewsSettings } from '@/newsStore';
import type { ThemeMode } from '@/types';

interface NewsContentProps {
  theme: ThemeMode;
  allowClose?: boolean;
  defaultNewsId?: string | null;
  animation?: NewsSettings['animation'];
  onClose?: () => void;
}

export default function NewsContent({ theme, allowClose = true, defaultNewsId = null, animation = 'scale', onClose }: NewsContentProps) {
  const [news, setNews] = useState<NewsItem[]>(getPublicNews());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [entered, setEntered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      await fetchPublicNews();
      setNews(getPublicNews());
    })();
  }, []);

  useEffect(() => {
    if (defaultNewsId) {
      const idx = news.findIndex((n) => n.id === defaultNewsId);
      if (idx >= 0) setCurrentIdx(idx);
    }
  }, [defaultNewsId, news]);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (news.length === 0) {
    return (
      <div className={`news-empty ${entered ? 'news-entered' : ''}`} ref={containerRef}>
        <div className="news-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18M7 14h6" />
          </svg>
        </div>
        <p className="news-empty-text">No news available</p>
      </div>
    );
  }

  const safeIdx = currentIdx >= 0 && currentIdx < news.length ? currentIdx : 0;
  const current = news[safeIdx];
  if (!current) {
    return (
      <div className={`news-empty ${entered ? 'news-entered' : ''}`} ref={containerRef}>
        <div className="news-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18M7 14h6" />
          </svg>
        </div>
        <p className="news-empty-text">No news available</p>
      </div>
    );
  }
  const photos = Array.isArray(current.photos) ? current.photos : [];

  const goPrev = () => {
    if (safeIdx > 0) setCurrentIdx(safeIdx - 1);
  };

  const goNext = () => {
    if (safeIdx < news.length - 1) setCurrentIdx(safeIdx + 1);
  };

  return (
    <div className={`news-window news-anim-${animation} ${entered ? 'news-entered' : ''} news-anim-${theme}`} ref={containerRef}>
      {allowClose && onClose && (
        <button className="news-close-btn" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      )}

      {news.length > 1 && (
        <>
          <button
            className="news-nav-btn news-nav-prev"
            onClick={goPrev}
            disabled={safeIdx === 0}
            title="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="news-nav-btn news-nav-next"
            onClick={goNext}
            disabled={safeIdx === news.length - 1}
            title="Next"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div className="news-scroll-container">
        {/* Cover image */}
        {current.cover_url && (
          <div className="news-cover">
            <img src={current.cover_url} alt={current.title} className="news-cover-img" />
            <div className="news-cover-overlay" />
          </div>
        )}

        {/* Title section */}
        <div className="news-header">
          <div className="news-date-badge">
            <Calendar size={12} />
            <span>{formatDate(current.date)}</span>
          </div>
          <h1 className="news-title">{current.title}</h1>
          {current.subtitle && <p className="news-subtitle">{current.subtitle}</p>}
        </div>

        {/* Article photos */}
        {photos.length > 0 && (
          <div className="news-photos">
            {photos.map((url, i) => (
              <div key={i} className="news-photo-item">
                <img src={url} alt={`Photo ${i + 1}`} className="news-article-img" />
              </div>
            ))}
          </div>
        )}

        {/* Pagination dots */}
        {news.length > 1 && (
          <div className="news-pagination">
            {news.map((_, i) => (
              <button
                key={i}
                className={`news-dot ${i === safeIdx ? 'active' : ''}`}
                onClick={() => setCurrentIdx(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
