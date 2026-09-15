'use client';

import { IconLogo } from '../Icons';

export function About() {
  return (
    <section className="contain settings">
      <section className="account-section">
        <header>
          <h2>About</h2>
        </header>
        <div className="account-settings-list">
          <div className="logo-image" style={{ maxWidth: 220, marginBottom: 16 }}>
            <IconLogo />
          </div>
          <p>
            Wallos is an open source personal subscription tracker. This is a Next.js and Supabase
            rebuild of the original PHP application, reusing its design and calculations.
          </p>
          <p>
            Original project:{' '}
            <a href="https://github.com/ellite/Wallos" target="_blank" rel="noreferrer">
              github.com/ellite/Wallos
            </a>
          </p>
        </div>
      </section>
    </section>
  );
}
