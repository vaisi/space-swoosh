// site.js
// Changes: Created. Shared boot for the content pages (About, How to play):
// mounts the starfield and points every [data-store] link at the current
// App Store / Google Play listing. The HTML already carries the default
// URLs so crawlers and no-JS visitors still get working links.

import { appStoreUrl, PLAY_STORE_URL } from '../services/StoreLinks.js';
import { mountStars } from './stars.js';

function wireStoreLinks() {
    const ios = appStoreUrl();
    document.querySelectorAll('a[data-store="ios"]').forEach((link) => {
        if (ios) link.href = ios;
    });
    document.querySelectorAll('a[data-store="play"]').forEach((link) => {
        link.href = PLAY_STORE_URL;
    });
}

const stars = document.querySelector('#stars');
if (stars instanceof HTMLCanvasElement) mountStars(stars);
wireStoreLinks();
