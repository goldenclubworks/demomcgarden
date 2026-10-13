import { EXTRAS, FINISHES, PACKAGES, PRICE_DATE, ROOF_COVERS } from '@/data/catalog';
import { configOf, priceLines, useStore } from '@/data/store';
import { de } from '@/i18n/de';
import { SPEC } from '@/model/spec';

const eur = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

function Swatches({ value, onPick, withSame }: { value: string; onPick: (id: never) => void; withSame?: boolean }) {
  return (
    <div className="swatches" role="radiogroup">
      {withSame && (
        <button className={`swatch same${value === 'same' ? ' on' : ''}`} onClick={() => onPick('same' as never)} role="radio" aria-checked={value === 'same'} title={de.same}>
          <span>{de.same}</span>
        </button>
      )}
      {FINISHES.map((f) => (
        <button
          key={f.id}
          className={`swatch${value === f.id ? ' on' : ''}`}
          style={{ ['--c' as string]: f.swatch }}
          onClick={() => onPick(f.id as never)}
          role="radio"
          aria-checked={value === f.id}
          title={f.label}
        >
          <i />
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, label, price, onClick }: { on: boolean; label: string; price?: string; onClick: () => void }) {
  return (
    <button className={`toggle${on ? ' on' : ''}`} onClick={onClick} role="switch" aria-checked={on}>
      <span className="knob" />
      <span className="t-label">{label}</span>
      {price && <span className="t-price">{price}</span>}
    </button>
  );
}

export function Panel() {
  const s = useStore();
  const open = s.panel;
  const setOpen = (v: boolean) => s.set({ panel: v });
  const price = priceLines(configOf(s));
  const addToCart = () => {
    const c = configOf(s);
    if (window.parent !== window) window.parent.postMessage({ type: 'mcgarden:addToCart', config: c, price }, '*');
    s.set({ toast: 'Demo: Hier übernimmt der Shop-Warenkorb die Konfiguration' });
  };
  const doorLabel = FINISHES.find((f) => f.id === (s.doorFinish === 'same' ? s.finish : s.doorFinish))?.label;
  return (
    <aside className={`panel${open ? '' : ' closed'}`} aria-label="Konfigurator">
      <button className="panel-handle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{open ? 'Konfigurator ausblenden' : 'Konfigurator'}</span>
        <b>{eur(price.total)}</b>
      </button>
      <div className="panel-scroll">
        <section>
          <h2>{de.sections.wood}</h2>
          <Swatches value={s.finish} onPick={(id) => s.set({ finish: id })} />
        </section>
        <section>
          <h2>{de.sections.door}</h2>
          <Swatches value={s.doorFinish} onPick={(id) => s.set({ doorFinish: id })} withSame />
          <p className="hint">Aktuell: {doorLabel}</p>
        </section>
        <section>
          <h2>{de.sections.roof}</h2>
          <div className="options">
            {ROOF_COVERS.map((r) => (
              <button key={r.id} className={`opt${s.roof === r.id ? ' on' : ''}`} onClick={() => s.set({ roof: r.id })}>
                <b>{r.label}</b>
                <small>{r.price ? eur(r.price) : 'inklusive'}</small>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h2>{de.sections.packages}</h2>
          <div className="options">
            {PACKAGES.map((p) => (
              <button key={p.id} className={`opt${s.package === p.id ? ' on' : ''}`} onClick={() => s.applyPackage(p.id)} title={p.items.join(' · ')}>
                <b>{p.label}</b>
                <small>{p.price ? eur(p.price) : '–'}</small>
              </button>
            ))}
          </div>
          {s.package !== 'none' && <p className="hint">{PACKAGES.find((p) => p.id === s.package)!.items.join(' · ')}</p>}
        </section>
        <section>
          <h2>{de.sections.extras}</h2>
          <Toggle on={s.gutter} label={de.extras.gutter} price={eur(EXTRAS.gutter.price)} onClick={() => s.set({ gutter: !s.gutter })} />
          <Toggle on={s.floor} label={de.extras.floor} price={eur(EXTRAS.floor.price)} onClick={() => s.set({ floor: !s.floor })} />
          <Toggle on={s.mirrored} label={de.extras.mirrored} price="inklusive" onClick={() => s.set({ mirrored: !s.mirrored })} />
          <Toggle on={s.assemblyService} label={de.extras.assembly} price={eur(EXTRAS.assembly.price)} onClick={() => s.set({ assemblyService: !s.assemblyService })} />
        </section>
        <section>
          <h2>Technische Daten</h2>
          <dl className="facts">
            <dt>Außenmaß</dt><dd>{SPEC.outerX / 10} × {SPEC.outerZ / 10} cm</dd>
            <dt>Innenmaß</dt><dd>373,2 × 273,2 cm</dd>
            <dt>Nutzfläche</dt><dd>ca. 10,2 m²</dd>
            <dt>Wandhöhe</dt><dd>vorn 224 cm · hinten 209 cm</dd>
            <dt>Wandstärke</dt><dd>34 mm Blockbohle</dd>
            <dt>Material</dt><dd>Nordische Fichte, kammergetrocknet, FSC</dd>
            <dt>Dach</dt><dd>Pultdach, OSB-Dachplatte</dd>
            <dt>Lieferung</dt><dd>1 Packstück, ca. 680 kg, ca. 2 Wochen</dd>
          </dl>
        </section>
        <section className="summary">
          <h2>{de.sections.summary}</h2>
          <ul>
            {price.lines.map((l) => (
              <li key={l.label}>
                <span>{l.label}</span>
                <b>{eur(l.price)}</b>
              </li>
            ))}
          </ul>
          <div className="total">
            <span>{de.total}</span>
            <b>{eur(price.total)}</b>
          </div>
          <button className="cta" onClick={addToCart}>In den Warenkorb</button>
          <p className="hint">
            {de.vat}, {de.shipping} {eur(price.shipping)}. {de.priceNote(PRICE_DATE)}
          </p>
        </section>
      </div>
    </aside>
  );
}
