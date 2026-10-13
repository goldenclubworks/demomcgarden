import { useEffect } from 'react';
import { configOf, priceLines, useStore, type HouseConfig } from '@/data/store';

/**
 * postMessage-Schnittstelle für die Shop-Integration (iframe).
 *  → Shop:   { type: 'mcgarden:configChanged', config, price }
 *  ← Shop:   { type: 'mcgarden:setConfig', config: Partial<HouseConfig> }
 *  → Shop:   { type: 'mcgarden:ready' }
 */
export function useEmbedBridge() {
  useEffect(() => {
    const post = (msg: unknown) => window.parent !== window && window.parent.postMessage(msg, '*');
    const send = () => {
      const c = configOf(useStore.getState());
      post({ type: 'mcgarden:configChanged', config: c, price: priceLines(c) });
    };
    const unsub = useStore.subscribe((s, p) => {
      const a = configOf(s), b = configOf(p);
      if ((Object.keys(a) as (keyof HouseConfig)[]).some((k) => a[k] !== b[k])) send();
    });
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; config?: Partial<HouseConfig> };
      if (d?.type === 'mcgarden:setConfig' && d.config) useStore.getState().set(d.config);
    };
    window.addEventListener('message', onMsg);
    post({ type: 'mcgarden:ready' });
    send();
    return () => {
      unsub();
      window.removeEventListener('message', onMsg);
    };
  }, []);
}
