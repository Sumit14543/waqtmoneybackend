import { useEffect } from "react";

const focusableSelector = [
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "button",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const isVisible = (element: HTMLElement) =>
  element.offsetParent !== null || element.getClientRects().length > 0;

const shouldSkipEnterAsTab = (target: HTMLElement) => {
  if (target.closest("[data-enter-as-tab='false']")) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;

  if (target instanceof HTMLInputElement) {
    return ["button", "submit", "reset", "file", "checkbox", "radio"].includes(target.type);
  }

  return target instanceof HTMLButtonElement;
};

const getFocusableElements = (form: HTMLFormElement) =>
  Array.from(form.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.tabIndex !== -1 &&
      isVisible(element),
  );

const EnterKeyFocusHandler = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        event.defaultPrevented ||
        event.isComposing ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement) || shouldSkipEnterAsTab(target)) return;

      const form = target.closest("form");
      if (!(form instanceof HTMLFormElement) || form.dataset.enterAsTab === "false") return;

      const focusableElements = getFocusableElements(form);
      const currentIndex = focusableElements.indexOf(target);
      if (currentIndex === -1) return;

      const nextElement = focusableElements[currentIndex + 1];
      if (nextElement) {
        event.preventDefault();
        nextElement.focus();

        if (nextElement instanceof HTMLInputElement) {
          nextElement.select();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
};

export default EnterKeyFocusHandler;
