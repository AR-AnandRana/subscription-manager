'use client';

import { IconLogo } from './Icons';

interface Props {
  logo: string | null;
  logoVariant?: string | null;
  logoTextColor?: string | null;
  name: string;
  className?: string;
}

/**
 * Resolve a stored logo reference to a URL.
 *
 * Uploaded logos are stored in Supabase Storage and saved as absolute URLs;
 * the bundled sample logos keep upstream's relative `images/uploads/logos/…`
 * form, so both shapes have to work.
 */
export function logoSrc(logo: string | null | undefined): string | null {
  if (!logo) return null;
  if (/^https?:\/\//.test(logo) || logo.startsWith('data:')) return logo;
  if (logo.startsWith('images/')) return `/${logo}`;
  return `/images/uploads/logos/${logo}`;
}

/**
 * Renders a subscription logo, mirroring upstream's `renderThemedLogoImg()`.
 *
 * A logo whose ink is plain black or plain white disappears against one of the
 * two themes, so Wallos generates a recoloured variant and ships both images,
 * letting CSS show whichever suits the active theme. Colourful logos have no
 * variant and render as a single image.
 */
export function SubscriptionLogo({ logo, logoVariant, logoTextColor, name, className = '' }: Props) {
  const src = logoSrc(logo);
  if (!src) return <IconLogo />;

  const variantSrc = logoSrc(logoVariant);
  if (!logoTextColor || !variantSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} className={className} alt={`${name} logo`} title={name} />;
  }

  // The theme the original file already reads well on.
  const nativeTheme = logoTextColor === 'dark' ? 'light' : 'dark';

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        className={`${className} logo-theme-original`.trim()}
        data-native-theme={nativeTheme}
        alt={`${name} logo`}
        title={name}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variantSrc}
        className={`${className} logo-theme-variant`.trim()}
        data-native-theme={nativeTheme}
        alt={`${name} logo`}
        title={name}
      />
    </>
  );
}
