import raw from "../../content/math-course/videos.json";

export type CourseVideo = {
  id: string;
  title: string;
  sourceTitle: string;
  duration: string;
  playlistId: string;
  sourceGrade: number;
};
export type CourseVideoCollection = {
  items: CourseVideo[];
  pageVideoIndices: number[];
  coursePlaylistId: string;
  note?: string;
};
export const courseVideos = raw as Record<string, CourseVideoCollection>;
export function youtubeEmbedUrl(id: string) {
  if (!/^[\w-]{11}$/.test(id)) throw Error("Некорректная ссылка на видео");
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&hl=ru&autoplay=0`;
}
export function youtubeWatchUrl(video: CourseVideo) {
  return `https://www.youtube.com/watch?v=${video.id}&list=${video.playlistId}`;
}
export function youtubePlaylistUrl(id: string) {
  return `https://www.youtube.com/playlist?list=${id}`;
}
