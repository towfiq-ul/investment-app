# Investment app – public pages

Static pages for the **Investment** Android app,
served by GitHub Pages from the `master` branch root.

| Page | File | URL |
| --- | --- | --- |
| Home | `index.html` | https://towfiq-ul.github.io/investment-app/ |
| Become a beta user | `invite/tester/index.html` | https://towfiq-ul.github.io/investment-app/invite/tester/ |
| Privacy policy | `privacy-policy/index.html` | https://towfiq-ul.github.io/investment-app/privacy-policy/ |

Logo: `assets/logo.svg` (vector) and `assets/logo-512.png` (Play Store icon).

The privacy policy source is `privacy-policy.html` in the app project; keep both copies the same.
The app shows this page in a WebView, and the Play listing links to it.

Plain HTML, no build step. Push to `master` to deploy.
