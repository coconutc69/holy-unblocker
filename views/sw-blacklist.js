importScripts('{{route}}{{/scram/controller.sw.js}}');
importScripts('{{route}}{{/uv/uv.bundle.js}}');
importScripts('{{route}}{{/uv/uv.config.js}}');
importScripts(self['{{__uv$config}}'].sw || '{{route}}{{/uv/uv.sw.js}}');

const uv = new UVServiceWorker();

const SJ_CONTROLLER_PREFIX = '{{route}}{{/scram/network/}}';

const blacklist = {};
fetch('{{route}}{{/assets/txt/blacklist.txt}}').then((request) => {
  request.text().then((textData) => {
    textData
      .split('\n')
      .filter((domain) => domain.trim())
      .forEach((domain) => {
        const domainTld = domain.replace(/.+(?=\.\w)/, '');
        if (!blacklist.hasOwnProperty(domainTld)) blacklist[domainTld] = [];
        blacklist[domainTld].push(
          encodeURIComponent(domain.slice(0, -domainTld.length))
            .replace(/([()])/g, '\\$1')
            .replace(/(\*\.)|\./g, (match, exp) =>
              exp ? '(?:.+\\.)?' : '\\' + match
            )
        );
      });

    for (let [tld, domains] of Object.entries(blacklist))
      blacklist[tld] = new RegExp(`^(?:${domains.join('|')})$`);
    Object.freeze(blacklist);
  });
});

const isBlacklistedDomain = (domain) => {
  if (!domain) return false;
  const domainTld = domain.replace(/.+(?=\.\w)/, '');
  return (
    blacklist.hasOwnProperty(domainTld) &&
    blacklist[domainTld].test(domain.slice(0, -domainTld.length))
  );
};

const targetHostnameForScramjet = (reqUrl) => {
  try {
    const path = new URL(reqUrl).pathname;
    if (!path.startsWith(SJ_CONTROLLER_PREFIX)) return null;
    const rest = path.slice(SJ_CONTROLLER_PREFIX.length).split('/');
    if (rest.length < 3) return null;
    const encoded = rest.slice(2).join('/');
    if (!encoded) return null;
    return new URL(decodeURIComponent(encoded)).hostname;
  } catch {
    return null;
  }
};

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      if ($scramjetController.shouldRoute(event)) {
        const hostname = targetHostnameForScramjet(event.request.url);
        if (isBlacklistedDomain(hostname))
          return new Response(new Blob(), { status: 406 });
        return $scramjetController.route(event);
      }

      if (uv.route(event)) {
        try {
          const hostname = new URL(
            uv.config.decodeUrl(
              new URL(event.request.url).pathname.replace(uv.config.prefix, '')
            )
          ).hostname;
          if (isBlacklistedDomain(hostname))
            return new Response(new Blob(), { status: 406 });
        } catch {
        }
        return await uv.fetch(event);
      }

      return fetch(event.request);
    })()
  );
});
