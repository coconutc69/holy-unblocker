importScripts('{{route}}{{/scram/controller.sw.js}}');
importScripts('{{route}}{{/uv/uv.bundle.js}}');
importScripts('{{route}}{{/uv/uv.config.js}}');
importScripts(self['{{__uv$config}}'].sw || '{{route}}{{/uv/uv.sw.js}}');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      if ($scramjetController.shouldRoute(event))
        return $scramjetController.route(event);

      if (uv.route(event)) return await uv.fetch(event);

      return fetch(event.request);
    })()
  );
});
