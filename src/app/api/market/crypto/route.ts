import { NextResponse } from 'next/server';
import { CRYPTO_BASELINES, CryptoAsset } from '@/lib/market-data';

interface GeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  total_volume: number;
  market_cap_rank: number;
}

const cache: { data: CryptoAsset[] | null; ts: number; source: 'live' | 'fallback' } = {
  data: null, ts: 0, source: 'fallback',
};
const TTL = 90 * 1000; // 90 seconds

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.ts < TTL) {
    return NextResponse.json({ assets: cache.data, source: cache.source, ts: cache.ts });
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h',
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6000), cache: 'no-store' }
    );
    if (!res.ok) throw new Error('CoinGecko status ' + res.status);
    const coins: GeckoCoin[] = await res.json();

    const assets: CryptoAsset[] = coins.map((c, i) => {
      const base = CRYPTO_BASELINES.find(b => b.id === c.id);
      return {
        id: c.id,
        symbol: (c.symbol || '').toLowerCase(),
        name: c.name,
        image: c.image || base?.image || '/crypto/btc.svg',
        price: c.current_price,
        change24h: c.price_change_percentage_24h ?? 0,
        marketCap: c.market_cap,
        volume24h: c.total_volume,
        rank: c.market_cap_rank || i + 1,
        about: base?.about || '',
        tags: base?.tags || [],
      };
    });
    // Enrich any missing "about" copy
    for (const a of assets) {
      if (!a.about) {
        const b = CRYPTO_BASELINES.find(x => x.symbol === a.symbol);
        if (b) { a.about = b.about; a.tags = b.tags; }
      }
    }

    cache.data = assets; cache.ts = now; cache.source = 'live';
    return NextResponse.json({ assets, source: 'live', ts: now });
  } catch {
    // fallback with a gentle simulated drift so UI still feels alive
    const drift = CRYPTO_BASELINES.map(a => ({
      ...a,
      price: a.price * (1 + (Math.random() - 0.5) * 0.004),
      change24h: +(a.change24h + (Math.random() - 0.5) * 0.3).toFixed(2),
    }));
    cache.data = drift; cache.ts = now; cache.source = 'fallback';
    return NextResponse.json({ assets: drift, source: 'fallback', ts: now });
  }
}
