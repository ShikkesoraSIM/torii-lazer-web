import DOMPurify from 'dompurify';

// torii: ultima barrera antes de cualquier dangerouslySetInnerHTML de BBCode.
// El parser del cliente escapa y valida, y el server pasa por bleach, pero un
// bug en cualquiera de los dos no tiene que terminar en un <script> o un
// onerror en la pagina de otro usuario. DOMPurify saca todo lo que no sea
// markup inerte y solo deja URLs http(s)/mailto/relativas.
//
// iframe no esta en la lista por defecto: se agrega SOLO para el embed de
// youtube, y los hooks de abajo tiran cualquier iframe cuyo src no sea
// exactamente ese.
const youtubeEmbed = /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}(\?[A-Za-z0-9_=&-]*)?$/;

let hooked = false;

function ensureHooks(): void {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = (node as Element).getAttribute('src') ?? '';
      if (!youtubeEmbed.test(src)) node.parentNode?.removeChild(node);
    }
  });
}

export function sanitizeBBCodeHtml(html: string | null | undefined): string {
  if (!html) return '';
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'target', 'loading', 'usemap', 'preload', 'controls'],
  });
}
