/**
 * Every icon the app uses, named once.
 *
 * olum-icons hands back plain SVG strings, so an icon is just a value -- pass
 * it to <Icon icon="{Send}" /> and size it with a Tailwind class.
 *
 * Each icon is imported from its OWN file, not from the "olum-icons/lucide"
 * barrel. The barrel re-exports 1766 modules: a bundler still tree-shakes the
 * unused ones out of the output, but it has to parse every one of them first,
 * and the dev server has no bundler at all -- it serves ES modules straight to
 * the browser, so one barrel import is 1766 HTTP requests before the app can
 * paint. The package's "./*.js" export exists for exactly this, and the cost
 * of using it is that a new icon needs a line here instead of a name in a
 * list. Worth it.
 */
export { ArrowUp } from "olum-icons/lucide/ArrowUp.js";
export { Check } from "olum-icons/lucide/Check.js";
export { ChevronDown } from "olum-icons/lucide/ChevronDown.js";
export { Copy } from "olum-icons/lucide/Copy.js";
export { Lightbulb } from "olum-icons/lucide/Lightbulb.js";
export { Mic } from "olum-icons/lucide/Mic.js";
export { Moon } from "olum-icons/lucide/Moon.js";
export { Paperclip } from "olum-icons/lucide/Paperclip.js";
export { SquarePen } from "olum-icons/lucide/SquarePen.js";
export { Sun } from "olum-icons/lucide/Sun.js";
