/** Hvor appen kjører, for å gi riktig hjelp til å legge den på Hjem-skjermen. */
export type InstallPlatform =
  /** Kjører allerede som installert app */
  | 'installed'
  /** Innebygd nettleser i Messenger, Instagram, Snapchat o.l. – der kan man ikke installere */
  | 'in-app'
  | 'android'
  | 'ios'
  | 'desktop';

export type InstallBrowser = 'chrome' | 'samsung' | 'firefox' | 'edge' | 'safari' | 'other';

export interface InstallContext {
  platform: InstallPlatform;
  os: 'android' | 'ios' | 'other';
  browser: InstallBrowser;
}

const IN_APP =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Snapchat|Messenger|MicroMessenger|Line\/|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Pinterest|GSA\/|; wv\)/i;

export function installContext(
  userAgent: string,
  standalone: boolean,
  maxTouchPoints = 0,
): InstallContext {
  const android = /Android/i.test(userAgent);
  // iPad med «skrivebordsnettsted» sier Macintosh, men har berøringsskjerm.
  const ios =
    /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const os = android ? 'android' : ios ? 'ios' : 'other';
  const browser: InstallBrowser = /SamsungBrowser/i.test(userAgent)
    ? 'samsung'
    : /Firefox|FxiOS/i.test(userAgent)
      ? 'firefox'
      : /EdgA|EdgiOS|Edg\//i.test(userAgent)
        ? 'edge'
        : /Chrome|CriOS/i.test(userAgent)
          ? 'chrome'
          : /Safari/i.test(userAgent)
            ? 'safari'
            : 'other';
  const platform: InstallPlatform = standalone
    ? 'installed'
    : (android || ios) && IN_APP.test(userAgent)
      ? 'in-app'
      : android
        ? 'android'
        : ios
          ? 'ios'
          : 'desktop';
  return { platform, os, browser };
}

/**
 * Skal appen installeres fra Chrome i stedet? Gjelder innebygde nettlesere på Android og
 * Samsung Internet: Samsung Internet pakker appen inn selv (WebAPK for eldre Android), og
 * Google Play Protect blokkerer den med «En utrygg app er blokkert». Fra Chrome går det fint.
 */
export function shouldInstallFromChrome(context: InstallContext): boolean {
  return (
    context.os === 'android' &&
    (context.platform === 'in-app' ||
      (context.platform === 'android' && context.browser === 'samsung'))
  );
}

const CHROME_IN_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.android.chrome';

/** Lenke som åpner adressen i Chrome på Android (og Chrome i Play Butikk hvis Chrome mangler). */
export function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  const scheme = url.protocol.replace(':', '');
  const fallback = encodeURIComponent(CHROME_IN_PLAY_STORE);
  return `intent://${url.host}${url.pathname}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}
