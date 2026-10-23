import { course } from "./model";

/** Only a real lesson can open the learning screen; old catalogue links return home. */
export function lessonFromHash(hash: string): string | null {
  const match = /^#\/lesson\/([AG]\d{2}-\d{2})$/.exec(hash);
  return match && course.some((topic) => topic.id === match[1])
    ? match[1]
    : null;
}
