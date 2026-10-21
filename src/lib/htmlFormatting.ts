const COLOR_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  '-webkit-text-fill-color',
]);

const COLOR_ATTRIBUTES = new Set(['color', 'bgcolor']);

function stripColorStylesFromElement(element: HTMLElement) {
  COLOR_ATTRIBUTES.forEach((attr) => {
    if (element.hasAttribute(attr)) {
      element.removeAttribute(attr);
    }
  });

  const style = element.getAttribute('style');
  if (!style) return;

  const sanitizedDeclarations = style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const [property] = decl.split(':');
      if (!property) return false;
      return !COLOR_STYLE_PROPERTIES.has(property.trim().toLowerCase());
    });

  if (sanitizedDeclarations.length === 0) {
    element.removeAttribute('style');
    return;
  }

  element.setAttribute('style', sanitizedDeclarations.join('; '));
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

export function stripColorFormatting(html: string): string {
  if (!html) return html;
  if (typeof DOMParser === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.body.querySelectorAll<HTMLElement>('mark').forEach((element) => {
    unwrapElement(element);
  });

  doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    stripColorStylesFromElement(element);
  });

  return doc.body.innerHTML;
}
