// NOTE: this is a polyfill for custom elements tha t extend native elements;
// so for example `<button is="my-custom-button">`. This is NOT supported in
// Safari/WebKit (and never will be), polyfill handle this & is a no-op in other browsers.
import "@ungap/custom-elements";

import { FormField, FormFieldSummary } from "./components/form-field.ts";
import { FormStep, MultiStepForm, MultiStepControl } from "./components/multistep-form.ts";

customElements.define("form-field-summary", FormFieldSummary, {
  extends: "output",
});
customElements.define("form-field", FormField);
customElements.define("multistep-form", MultiStepForm, { extends: "form" });
customElements.define("form-step", FormStep);
customElements.define("multistep-control", MultiStepControl, {
  extends: "button",
});
