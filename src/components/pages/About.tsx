'use client';

import { useAppData } from '../AppDataProvider';
import { WALLOS_VERSION } from '@/lib/constants';

/** Mirrors about.php: an About card and a Credits card of `.credits-list` rows. */
export function About() {
  const { t } = useAppData();

  return (
    <section className="contain">
      <section className="account-section">
        <header>
          <h2>{t('about')}</h2>
        </header>
        <div className="credits-list">
          <CreditRow title={`Wallos ${WALLOS_VERSION}`} label={t('release_notes')}
            href={`https://github.com/ellite/Wallos/releases/tag/${WALLOS_VERSION}`} linkOnly />
          <CreditRow title={t('license')} label="GPLv3" href="https://www.gnu.org/licenses/gpl-3.0.en.html" />
          <CreditRow title={t('issues_and_requests')} label="GitHub" href="https://github.com/ellite/Wallos/issues" />
          <CreditRow title={t('the_author')} label="https://henrique.pt" href="https://henrique.pt/" />
        </div>
      </section>

      <section className="account-section">
        <header>
          <h2>{t('credits')}</h2>
        </header>
        <div className="credits-list">
          <CreditRow
            title={t('payment_icons')}
            label="https://www.figma.com/file/5IMW8JfoXfB5GRlPNdTyeg/Credit-Cards-and-Payment-Methods-Icons-(Community)"
            href="https://www.figma.com/file/5IMW8JfoXfB5GRlPNdTyeg/Credit-Cards-and-Payment-Methods-Icons-(Community)"
          />
          <CreditRow title="ApexCharts" label="https://apexcharts.com/" href="https://apexcharts.com/" />
          <CreditRow title="QRCode.js" label="https://github.com/davidshimjs/qrcodejs" href="https://github.com/davidshimjs/qrcodejs" />
          <CreditRow title="Icons by icons8" label="https://icons8.com/" href="https://icons8.com/" />
        </div>
      </section>
    </section>
  );
}

function CreditRow({
  title,
  label,
  href,
  linkOnly,
}: {
  title: string;
  label: string;
  href: string;
  linkOnly?: boolean;
}) {
  const { t } = useAppData();
  return (
    <div>
      <h3>{title}</h3>
      <span>
        {label}
        <a href={href} target="_blank" title={t('external_url')} rel="noreferrer">
          <i className="fa-solid fa-arrow-up-right-from-square" />
        </a>
      </span>
      {linkOnly && null}
    </div>
  );
}
