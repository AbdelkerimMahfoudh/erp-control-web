/**
 * Every form of the portal and the console (owner, 2026-11-16): a sign-in or sign-up pressed with a required field
 * empty, or a field that does not meet its rule, outlines that field and moves to the first of them in the form's order.
 *
 * A form that leaves validation to the browser gets it there already; this marks the form so its fields are outlined.
 * A `noValidate` form is stopped before its handler runs when a field breaks its own rule; and a field a handler marks
 * `aria-invalid` after the press is focused the same way.
 */
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isControl = (el: Element): el is Control =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

export function firstInvalid(form: HTMLFormElement): Control | null {
  for (const el of Array.from(form.elements)) {
    if (!isControl(el) || !el.willValidate || el.disabled) continue;
    const blankRequired = el.required && el.value.trim() === '' && el.type !== 'checkbox' && el.type !== 'radio';
    if (blankRequired || !el.validity.valid) return el;
  }
  return null;
}

function goTo(el: HTMLElement) {
  el.focus({ preventScroll: true });
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

export function installFormGuard(doc: Document = document) {
  doc.addEventListener(
    'invalid',
    (e) => {
      (e.target as Element).closest('form')?.classList.add('tried');
    },
    true,
  );
  doc.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      form.classList.add('tried');
      const bad = firstInvalid(form);
      if (bad) {
        e.preventDefault();
        e.stopImmediatePropagation();
        goTo(bad);
        return;
      }
      // A handler's own checks mark their fields after the press; move to the first of them.
      setTimeout(() => {
        const marked = form.querySelector<HTMLElement>('[aria-invalid="true"]');
        if (marked && !marked.contains(doc.activeElement)) goTo(marked);
      }, 0);
    },
    true,
  );
}
