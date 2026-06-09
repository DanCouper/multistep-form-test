import { type FieldElement, isFieldElement } from "./form-field-utils.ts";

/** A human-readable view of a field's current value. */
function fieldDisplayValue(field: FieldElement): string {
  if (field instanceof HTMLSelectElement) {
    return Array.from(field.selectedOptions)
      .map((option) => option.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(", ");
  }
  if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
    return field.checked ? field.value : "";
  }
  return field.value;
}

let uidCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${(uidCounter += 1)}`;
}

/**
 * `<form-field>` — wraps a label, a single control, and an error slot.
 */
export class FormField extends HTMLElement {
  #input: FieldElement | null = null;
  #error: HTMLElement | null = null;
  #touched = false;
  #abort = new AbortController();

  get valid(): boolean {
    return this.#input?.validity.valid ?? true;
  }

  connectedCallback(): void {
    this.#input = this.querySelector<FieldElement>("input, select, textarea");
    this.#error = this.querySelector<HTMLElement>("[data-field-error]") ?? this.querySelector("p");
    if (!this.#input) {
      console.warn("<form-field> contains no input/select/textarea.");
      return;
    }

    if (this.#error) {
      if (!this.#error.id) this.#error.id = uniqueId("field-error");
      const describedby = this.#input.getAttribute("aria-describedby");
      const ids = describedby ? describedby.split(/\s+/) : [];
      if (!ids.includes(this.#error.id)) {
        this.#input.setAttribute("aria-describedby", [...ids, this.#error.id].join(" "));
      }
    }

    this.#abort = new AbortController();
    const options = { signal: this.#abort.signal };
    this.#input.addEventListener("input", this, options);
    this.#input.addEventListener("blur", this, options);
    this.#input.addEventListener("invalid", this, options);
  }

  disconnectedCallback(): void {
    this.#abort.abort();
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case "input":
        if (this.#touched) this.#render();
        break;
      case "blur":
        this.#touched = true;
        this.#render();
        break;
      case "invalid":
        event.preventDefault();
        this.#touched = true;
        this.#render();
        break;
    }
  }

  #render(): void {
    if (!this.#input) return;
    const valid = this.#input.validity.valid;
    if (valid) this.#input.removeAttribute("aria-invalid");
    else this.#input.setAttribute("aria-invalid", "true");
    if (this.#error) {
      this.#error.textContent = valid ? "" : this.#input.validationMessage;
    }
  }
}

/**
 * `<output is="form-field-summary" for="fieldId">` — a read-only mirror of a
 * field's value, for a review/summary section.
 */
export class FormFieldSummary extends HTMLOutputElement {
  #field: FieldElement | null = null;
  #abort = new AbortController();

  get placeholder(): string {
    return this.getAttribute("placeholder") ?? "-";
  }

  connectedCallback(): void {
    this.#field = this.#resolveField();
    if (!this.#field) {
      console.warn(
        `<output is="form-field-summary"> found no field for for="${this.getAttribute("for") ?? ""}".`,
      );
      return;
    }

    this.#abort = new AbortController();
    this.#update();
    const options = { signal: this.#abort.signal };
    this.#field.addEventListener("input", this, options);
    this.#field.addEventListener("change", this, options);
  }

  disconnectedCallback(): void {
    this.#abort.abort();
  }

  handleEvent(event: Event): void {
    if (event.type === "input" || event.type === "change") this.#update();
  }

  #resolveField(): FieldElement | null {
    const first = this.getAttribute("for")?.trim().split(/\s+/)[0];
    const target = first ? this.ownerDocument.getElementById(first) : null;
    return isFieldElement(target) ? target : null;
  }

  #update(): void {
    const value = this.#field ? fieldDisplayValue(this.#field) : "";
    this.textContent = value.trim() === "" ? this.placeholder : value;
  }
}
