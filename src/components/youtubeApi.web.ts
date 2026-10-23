export type YouTubeInstance = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getAvailablePlaybackRates(): number[];
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  pauseVideo(): void;
  destroy(): void;
};
type YouTubeAPI = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady(): void;
        onError(event: { data: number }): void;
        onStateChange?(event: { data: number }): void;
        onPlaybackRateChange?(): void;
      };
    },
  ) => YouTubeInstance;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTubeAPI> | null = null;
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const timeout = setTimeout(fail, 12000);
    function fail() {
      clearTimeout(timeout);
      script.remove();
      loading = null;
      window.onYouTubeIframeAPIReady = previous;
      reject(new Error("YouTube API unavailable"));
    }
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) {
        clearTimeout(timeout);
        resolve(window.YT);
      }
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
