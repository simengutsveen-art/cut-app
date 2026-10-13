import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, installContext, shouldInstallFromChrome } from '../../src/lib/install';

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  androidInstagram:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0',
  androidMessenger:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/480.0.0.0;]',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
  iphoneSnapchat:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.10.0.40 (like Safari/8618.1.15.10.15, panda)',
  ipadDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};

describe('hvor appen kjører', () => {
  it('Android-nettlesere', () => {
    expect(installContext(UA.androidChrome, false)).toEqual({
      platform: 'android',
      os: 'android',
      browser: 'chrome',
    });
    expect(installContext(UA.samsung, false).browser).toBe('samsung');
    expect(installContext(UA.androidFirefox, false)).toMatchObject({
      platform: 'android',
      browser: 'firefox',
    });
  });

  it('innebygde nettlesere (Instagram, Messenger, Snapchat) kan ikke installere', () => {
    expect(installContext(UA.androidInstagram, false)).toMatchObject({
      platform: 'in-app',
      os: 'android',
    });
    expect(installContext(UA.androidMessenger, false).platform).toBe('in-app');
    expect(installContext(UA.iphoneSnapchat, false)).toMatchObject({
      platform: 'in-app',
      os: 'ios',
    });
  });

  it('iPhone og iPad', () => {
    expect(installContext(UA.iphoneSafari, false)).toEqual({
      platform: 'ios',
      os: 'ios',
      browser: 'safari',
    });
    expect(installContext(UA.iphoneChrome, false).browser).toBe('chrome');
    // iPad sier «Macintosh», men har berøringsskjerm.
    expect(installContext(UA.ipadDesktop, false, 5).platform).toBe('ios');
    expect(installContext(UA.ipadDesktop, false, 0).platform).toBe('desktop');
  });

  it('installert app og PC', () => {
    expect(installContext(UA.androidChrome, true).platform).toBe('installed');
    expect(installContext(UA.windowsChrome, false).platform).toBe('desktop');
  });

  it('«Åpne i Chrome»-lenke uten #-adressen', () => {
    expect(chromeIntentUrl('https://simengutsveen-art.github.io/cut-app/#/mer')).toBe(
      'intent://simengutsveen-art.github.io/cut-app/#Intent;scheme=https;package=com.android.chrome;' +
        'S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.android.chrome;end',
    );
  });

  it('Samsung Internet og innebygde nettlesere på Android installerer via Chrome', () => {
    // Samsung Internet lager en app som Google Play Protect blokkerer («En utrygg app er blokkert»).
    expect(shouldInstallFromChrome(installContext(UA.samsung, false))).toBe(true);
    expect(shouldInstallFromChrome(installContext(UA.androidInstagram, false))).toBe(true);
    expect(shouldInstallFromChrome(installContext(UA.androidChrome, false))).toBe(false);
    expect(shouldInstallFromChrome(installContext(UA.androidFirefox, false))).toBe(false);
    expect(shouldInstallFromChrome(installContext(UA.iphoneSnapchat, false))).toBe(false);
    expect(shouldInstallFromChrome(installContext(UA.samsung, true))).toBe(false);
  });
});
