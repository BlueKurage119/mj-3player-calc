import { type JSX, useState } from 'react';
import type { TileOrBack } from '../../core/tile';
import { Tile } from './Tile';

const allTiles: TileOrBack[] = [
  // 萬子 (2種)
  { type: 'm', n: 1 },
  { type: 'm', n: 9 },
  // 筒子 (10種)
  { type: 'p', n: 1 },
  { type: 'p', n: 2 },
  { type: 'p', n: 3 },
  { type: 'p', n: 4 },
  { type: 'p', n: 5, red: false },
  { type: 'p', n: 5, red: true },
  { type: 'p', n: 6 },
  { type: 'p', n: 7 },
  { type: 'p', n: 8 },
  { type: 'p', n: 9 },
  // 索子 (10種)
  { type: 's', n: 1 },
  { type: 's', n: 2 },
  { type: 's', n: 3 },
  { type: 's', n: 4 },
  { type: 's', n: 5, red: false },
  { type: 's', n: 5, red: true },
  { type: 's', n: 6 },
  { type: 's', n: 7 },
  { type: 's', n: 8 },
  { type: 's', n: 9 },
  // 字牌 (7種)
  { type: 'z', n: 1 },
  { type: 'z', n: 2 },
  { type: 'z', n: 3 },
  { type: 'z', n: 4 },
  { type: 'z', n: 5 },
  { type: 'z', n: 6 },
  { type: 'z', n: 7 },
  // 裏 (1種)
  { type: 'back' }
];

export function TileGallery(): JSX.Element {
  const [interactiveSelected, setInteractiveSelected] = useState(false);
  const [size, setSize] = useState<'1.5rem' | '2.5rem' | '4rem'>('2.5rem');

  return (
    <main style={{ padding: '1.5rem' }}>
      <h1>牌ギャラリー (C3 検収用)</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>表示サイズ切替</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" onClick={() => setSize('1.5rem')}>
            小 (1.5rem)
          </button>
          <button type="button" onClick={() => setSize('2.5rem')}>
            標準 (2.5rem)
          </button>
          <button type="button" onClick={() => setSize('4rem')}>
            大 (4rem)
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>30種の牌一覧 (サイズ: {size})</h2>
        <div
          style={
            {
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              '--tile-width': size
            } as React.CSSProperties
          }
        >
          {allTiles.map((tile, index) => {
            const key =
              tile.type === 'back'
                ? 'back'
                : `${tile.type}${tile.n}${
                    tile.type !== 'z' &&
                    tile.n === 5 &&
                    'red' in tile &&
                    tile.red
                      ? 'r'
                      : ''
                  }`;
            return <Tile key={`${key}-${index}`} tile={tile} />;
          })}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>状態バリエーション</h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center'
          }}
        >
          <div>
            <p>通常 (表示のみ)</p>
            <Tile tile={{ type: 'z', n: 1 }} />
          </div>
          <div>
            <p>選択状態 (selected=true)</p>
            <Tile tile={{ type: 'z', n: 1 }} selected={true} />
          </div>
          <div>
            <p>押下可能 (クリックで選択切替)</p>
            <Tile
              tile={{ type: 'p', n: 5, red: true }}
              selected={interactiveSelected}
              onClick={() => setInteractiveSelected(prev => !prev)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default TileGallery;
