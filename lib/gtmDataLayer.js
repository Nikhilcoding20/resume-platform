/** Push a GTM dataLayer event (client-only). */
export function pushGtmEvent(event) {
  if (typeof window !== 'undefined') {
    window.dataLayer?.push({ event })
  }
}
