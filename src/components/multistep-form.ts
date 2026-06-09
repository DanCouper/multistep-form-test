import { associatedForm, clamp, type FieldElement } from "./form-field-utils.ts";

const STEP_SELECTOR = "form-step";

/** Shared observer options: watch descendants' `[active]` attribute. */
const WATCH_ACTIVE: MutationObserverInit = {
  attributes: true,
  attributeFilter: ["active"],
  subtree: true,
};

/**
 * Start a MutationObserver and tie its teardown to `signal` — the same
 * AbortController that owns the element's event listeners. Callers never touch
 * the observer directly; one `abort()` cleans up listeners and observers alike.
 */
function observe(
  target: Node,
  options: MutationObserverInit,
  callback: MutationCallback,
  signal: AbortSignal,
): void {
  const observer = new MutationObserver(callback);
  observer.observe(target, options);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}

/**
 * `<form is="multi-step-form">` — the host.
 *
 * On connect it discovers its `form-step` children and keeps that list current
 * via a MutationObserver, so steps may be added or removed at runtime. With no
 * steps it simply does nothing (no error).
 *
 * It never sets `hidden`: which step is shown, and how, is left to CSS (e.g. a
 * horizontal grid you scroll through). The component only exposes state for the
 * stylesheet to react to.
 */
export class MultiStepForm extends HTMLFormElement {
  #steps: readonly FormStep[] = [];
  #currentStepIndex = 0;
  #abort = new AbortController();

  async connectedCallback(): Promise<void> {
    await customElements.whenDefined("form-step");
    if (!this.isConnected) return;

    this.#abort = new AbortController();
    observe(this, { childList: true, subtree: true }, () => this.#syncSteps(), this.#abort.signal);
    this.#syncSteps();
  }

  disconnectedCallback(): void {
    this.#abort.abort();
  }

  get steps(): readonly FormStep[] {
    return this.#steps;
  }

  get currentStepIndex(): number {
    return this.#currentStepIndex;
  }

  set currentStepIndex(index: number) {
    this.#currentStepIndex = clamp(index, 0, this.#steps.length - 1);
    this.#steps.forEach((step, stepIndex) => {
      step.active = stepIndex === this.#currentStepIndex;
    });
  }

  get currentStep(): FormStep | null {
    return this.#steps[this.#currentStepIndex] ?? null;
  }

  /**
   * Gated navigation. Going backward (or staying) is always allowed; going
   * forward walks step-by-step and stops at the first incomplete step, surfacing
   * its errors instead of advancing past it. Controls and the indicator call
   * this rather than setting `currentStepIndex` directly.
   */
  requestStep(target: number): void {
    const next = clamp(target, 0, this.#steps.length - 1);
    if (next <= this.#currentStepIndex) {
      this.currentStepIndex = next;
      return;
    }
    for (let i = this.#currentStepIndex; i < next; i += 1) {
      if (!this.#steps[i].isValid) {
        this.currentStepIndex = i;
        this.#steps[i].surfaceErrors();
        return;
      }
    }
    this.currentStepIndex = next;
  }

  #syncSteps(): void {
    this.#steps = Array.from(this.querySelectorAll<FormStep>(STEP_SELECTOR));
    this.currentStepIndex = this.#currentStepIndex;
  }
}

/**
 * `<form-step>` — one step of the form.
 *
 * Knows how to represent whether it is the *current* step, but never how that
 * looks: `[active]` is the styling hook (its single source of truth), and
 * `aria-current="step"` is kept in lockstep purely for assistive tech — it is
 * never used as a styling hook itself. An inactive step is also set `inert`
 * (not `hidden`): it still lays out, so CSS stays in charge of visibility, but
 * it can't be focused, clicked, or reached by assistive tech.
 *
 * It also exposes its aggregate validity: `isValid` is a fold over its controls'
 * native `.validity`, and `[data-invalid]` is reflected for consumers (controls,
 * CSS) to observe. Validity isn't stored — it's derived from the Constraint
 * Validation API, recomputed whenever a field reports input.
 */
export class FormStep extends HTMLElement {
  static observedAttributes = ["active"];

  #abort = new AbortController();

  /**
   * The constrained controls in this step. An autonomous element has no
   * `.elements` (that's a `<fieldset>` affordance), so we query descendants
   * directly.
   */
  #fields(): FieldElement[] {
    return Array.from(this.querySelectorAll<FieldElement>("input, select, textarea"));
  }

  get active(): boolean {
    return this.hasAttribute("active");
  }

  set active(value: boolean) {
    this.toggleAttribute("active", value);
    this.inert = !value;
  }

  /** True when every constrained control in the step currently validates. */
  get isValid(): boolean {
    return this.#fields().every((field) => field.validity.valid);
  }

  /**
   * Surface this step's errors and focus the first invalid control. Uses
   * `checkValidity()` so the native `invalid` event fires (which each
   * `<form-field>` renders) without the browser's own bubble UI.
   * Returns whether the step is valid.
   */
  surfaceErrors(): boolean {
    let firstInvalid: FieldElement | null = null;
    for (const field of this.#fields()) {
      if (!field.checkValidity()) firstInvalid ??= field;
    }
    firstInvalid?.focus();
    return firstInvalid === null;
  }

  connectedCallback(): void {
    this.#abort = new AbortController();
    const options = { signal: this.#abort.signal };
    this.addEventListener("input", this, options);
    this.addEventListener("change", this, options);
    this.#reflectValidity();
  }

  disconnectedCallback(): void {
    this.#abort.abort();
  }

  handleEvent(event: Event): void {
    if (event.type === "input" || event.type === "change") {
      this.#reflectValidity();
    }
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name !== "active") return;
    if (value !== null) this.setAttribute("aria-current", "step");
    else this.removeAttribute("aria-current");
  }

  #reflectValidity(): void {
    this.toggleAttribute("data-invalid", !this.isValid);
  }
}

type ControlDirection = "prev" | "next";

/**
 * `<button is="multi-step-control" direction="prev|next">` — a navigation
 * control authored directly in the HTML (never generated), so it lives wherever
 * the markup and styling want it.
 *
 * It finds its form (see {@link associatedForm}) and, on click, asks the form to
 * move one step in its direction (the form gates forward moves and surfaces
 * errors). It disables itself at the boundary (prev on the first step, next on
 * the last), staying in sync via the shared `[active]` state.
 *
 * `type` is forced to "button" so it can never accidentally submit the form.
 */
export class MultiStepControl extends HTMLButtonElement {
  #form: MultiStepForm | null = null;
  #abort = new AbortController();

  get direction(): ControlDirection | null {
    const value = this.getAttribute("direction");
    return value === "prev" || value === "next" ? value : null;
  }

  async connectedCallback(): Promise<void> {
    await Promise.all([
      customElements.whenDefined("multistep-form"),
      customElements.whenDefined("form-step"),
    ]);
    if (!this.isConnected) return;

    if (!this.direction) {
      console.warn('<button is="multistep-control"> needs direction="prev" or "next".');
      return;
    }

    const form = associatedForm(this);
    if (!(form instanceof MultiStepForm)) {
      console.warn('<button is="multistep-control"> could not find its multi-step form.');
      return;
    }
    this.#form = form;
    this.#abort = new AbortController();
    this.type = "button";

    this.#updateDisabled();
    this.addEventListener("click", this, { signal: this.#abort.signal });
    observe(form, WATCH_ACTIVE, () => this.#updateDisabled(), this.#abort.signal);
  }

  disconnectedCallback(): void {
    this.#abort.abort();
  }

  handleEvent(event: Event): void {
    if (event.type === "click") this.#onClick();
  }

  #onClick(): void {
    if (!this.#form || !this.direction) return;
    const delta = this.direction === "next" ? 1 : -1;
    this.#form.requestStep(this.#form.currentStepIndex + delta);
  }

  #updateDisabled(): void {
    if (!this.#form) return;
    const stepCount = this.#form.querySelectorAll(STEP_SELECTOR).length;
    const current = this.#form.currentStepIndex;
    this.disabled = this.direction === "next" ? current >= stepCount - 1 : current <= 0;
  }
}
