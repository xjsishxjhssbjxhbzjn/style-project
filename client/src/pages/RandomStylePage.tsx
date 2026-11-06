import { Shuffle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchRandomStyle, type RandomStyleResponse } from '../api/randomStyle';
import { ChatPanelHeader } from '../components/ChatPanelHeader';
import { DotBackground } from '../components/DotBackground';
import './RandomStylePage.css';
import '../components/ChatWindow.css';

function StyleDetailSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="random-style-detail__section">
      <h3 className="random-style-detail__heading">{title}</h3>
      <p className="random-style-detail__text">{items.join(', ')}</p>
    </section>
  );
}

function formatStyle(style: RandomStyleResponse) {
  return (
    <div className="random-style-detail">
      <h2 className="random-style-detail__title">{style.name}</h2>
      <section className="random-style-detail__section">
        <h3 className="random-style-detail__heading">Эстетика</h3>
        <p className="random-style-detail__text">{style.aesthetics}</p>
      </section>
      <section className="random-style-detail__section">
        <h3 className="random-style-detail__heading">Визуальное впечатление</h3>
        <p className="random-style-detail__text">{style.visualImpression}</p>
      </section>
      <StyleDetailSection title="Палитра" items={style.colorPalette} />
      <StyleDetailSection title="Силуэты" items={style.silhouettes} />
      <StyleDetailSection title="Одежда и элементы" items={style.garmentElements} />
      <StyleDetailSection title="Аксессуары" items={style.accessories} />
      <StyleDetailSection title="Обувь" items={style.footwear} />
      <StyleDetailSection title="Материалы и фактуры" items={style.materials} />
    </div>
  );
}

export function RandomStylePage() {
  const [style, setStyle] = useState<RandomStyleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStyle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRandomStyle();
      setStyle(data);
    } catch (e) {
      setStyle(null);
      setError(e instanceof Error ? e.message : 'Ошибка загрузки.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStyle();
  }, [loadStyle]);

  return (
    <DotBackground>
      <div className="random-style-page page-enter">
        <div className="chat-window random-style-panel">
          <ChatPanelHeader />

          {isLoading && !style && (
            <p className="random-style-panel__status">Подбираем стиль…</p>
          )}
          {error && (
            <div className="random-style-panel__error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void loadStyle()}>
                Повторить
              </button>
            </div>
          )}

          {style && (
            <div className="random-style-panel__body">
              <div className="random-style-panel__photos">
                {style.photos.length > 0 ? (
                  style.photos.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="random-style-panel__photo"
                      loading="lazy"
                    />
                  ))
                ) : (
                  <p className="random-style-panel__no-photo">Нет фото для этого стиля</p>
                )}
              </div>
              <div className="random-style-panel__info">{formatStyle(style)}</div>
            </div>
          )}

          {style && (
            <button
              type="button"
              className="random-style-panel__shuffle"
              disabled={isLoading}
              onClick={() => void loadStyle()}
            >
              <Shuffle size={16} />
              Другой случайный стиль
            </button>
          )}
        </div>
      </div>
    </DotBackground>
  );
}
