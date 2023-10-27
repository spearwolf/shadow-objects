export function readBooleanAttribute(el: HTMLElement, name: string, defValue = false): boolean {
  let val: boolean | undefined = undefined;
  if (el.hasAttribute(name)) {
    const strVal = el.getAttribute(name).trim().toLowerCase();
    if (strVal === '' || strVal === 'true' || strVal === 'yes' || strVal === '1') {
      val = true;
    } else {
      val = false;
    }
  }
  if (el.hasAttribute(`no-${name}`)) {
    val = false;
  }
  return val ?? defValue;
}
