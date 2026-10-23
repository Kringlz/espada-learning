/** Keep the application path when hosted below an origin (for example Pages). */
export function webAuthRedirect(location: { origin: string; pathname: string }) {
  return `${location.origin}${location.pathname}`;
}
