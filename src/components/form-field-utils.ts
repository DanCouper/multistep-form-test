/**
 * Shared field helpers.
 *
 * @module
 */

export type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function isFieldElement(node: Element | null): node is FieldElement {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

/**
 * Resolve the `<form>` an element is associated with, mirroring how the native
 * `form` attribute works on form controls: an explicit `form="id"` wins (and
 * means "no form" if the id matches nothing — it does NOT fall back to an
 * ancestor), otherwise the nearest ancestor `<form>` is used.
 *
 * Returns a plain `HTMLFormElement`; callers narrow to a specific subtype.
 */
export function associatedForm(el: Element): HTMLFormElement | null {
  if (el.hasAttribute("form")) {
    const target = el.ownerDocument.getElementById(el.getAttribute("form")!);
    return target instanceof HTMLFormElement ? target : null;
  }
  const ancestor = el.closest("form");
  return ancestor instanceof HTMLFormElement ? ancestor : null;
}

/**
 * Can this please be added to the bloody language?
 */
export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  const safeValue = Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.max(min, Math.min(safeValue, max));
}
