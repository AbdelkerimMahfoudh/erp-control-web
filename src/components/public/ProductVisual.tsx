import { dukanOverviewFor } from '../../content';
import { SURFACE } from '../../config/site';
import { useI18n } from '../../i18n';
import { Icon } from './icons';

/**
 * The product, drawn in markup (2026-10-17): a phone showing the Today screen, a "drawer counted" card and an "IMEI
 * recorded once" card. It is an illustration of what the application does, built from the site's own styles — no
 * image to license, nothing the Content-Security-Policy would refuse, and it changes language with the page.
 *
 * Its words come from `content/dukan-overview.ts` (`visual`). Its numbers are ordinary demo values, labelled as such, with no
 * currency and no provider: nothing here is a customer's data or a claim about anyone. It is decorative for assistive
 * technology — the page's text says everything it shows.
 */
const STORE: Record<string, string> = { en: 'Tevragh Zeina', fr: 'Tevragh Zeina', ar: 'تفرغ زينة' };
const ROWS = [
  { icon: 'phone', name: 'Smartphone · 128 GB', amount: '185 000', imei: '···8827' },
  { icon: 'box', name: 'Wireless earbuds', amount: '38 000' },
  { icon: 'swap', name: 'Charger 65 W', amount: '12 500' },
] as const;

export function ProductVisual() {
  const { lang } = useI18n();
  const v = dukanOverviewFor(lang, SURFACE).visual;
  return (
    <div className="pv" aria-hidden="true">
      <div className="pv-phone-wrap">
        <div className="pv-phone">
          <div className="pv-screen">
            <div className="pv-status">
              <span className="num">09:41</span>
              <span>●●●</span>
            </div>
            <div className="pv-head">
              <small>{v.store}</small>
              <strong>{STORE[lang] ?? STORE.en}</strong>
            </div>
            <div className="pv-big">
              <small>{v.today}</small>
              <strong className="num">1 240 500</strong>
            </div>
            <div className="pv-chips">
              <span>
                <span className="num">48</span> {v.salesWord}
              </span>
              <span>
                <span className="num">3</span> {v.returnsWord}
              </span>
              <span className="ok">{v.counted}</span>
            </div>
            <div className="pv-list">
              {ROWS.map((row, i) => (
                <div key={row.name} className="pv-row">
                  <Icon name={row.icon} size={16} />
                  <div>
                    <b>{row.name}</b>
                    <small>
                      {i === 0 ? (
                        <>
                          IMEI <span className="num">{ROWS[0].imei}</span> · {v.paidCash}
                        </>
                      ) : i === 1 ? (
                        <>
                          <span className="num">2</span> · {v.mobileMoney}
                        </>
                      ) : (
                        <>
                          {v.owed} · <span className="num">5</span> {v.days}
                        </>
                      )}
                    </small>
                  </div>
                  <span className="amt num">{row.amount}</span>
                </div>
              ))}
            </div>
            <div className="pv-tabs">
              {v.tabs.map((tab, i) => (
                <span key={tab} className={i === 0 ? 'on' : undefined}>
                  {tab}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pv-card pv-card-a">
        <span className="pv-ic">
          <Icon name="check-circle" size={20} />
        </span>
        <div>
          <b>{v.drawerTitle}</b>
          <small>{v.drawerSub}</small>
        </div>
      </div>
      <div className="pv-card pv-card-b">
        <span className="pv-barcode" />
        <div>
          <b>{v.imeiTitle}</b>
          <small>{v.imeiSub}</small>
        </div>
      </div>
      <span className="pv-demo">{v.demo}</span>
    </div>
  );
}
