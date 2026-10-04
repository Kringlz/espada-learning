import test from "node:test";
import assert from "node:assert/strict";
import playlists from "../content/math-course/video-playlists.json";
import { course, courseSubject } from "../src/course/model";
import { courseContent } from "../src/course/content";
import {
  courseVideos,
  youtubeEmbedUrl,
  youtubeWatchUrl,
  videosForPage,
} from "../src/course/videos";

test("every article part has explicit relevant videos or an honest gap", () => {
  assert.equal(playlists.length, 12);
  assert.deepEqual(
    Object.keys(courseVideos).sort(),
    course.map((t) => t.id).sort(),
  );
  for (const topic of course) {
    const collection = courseVideos[topic.id];
    assert.equal(
      collection.pageVideos.length,
      courseContent[topic.id].pages.length,
      topic.id,
    );
    assert.ok(collection.items.length);
    assert.ok(
      collection.pageVideos.every(
        (indices) =>
          indices.every((i) => Number.isInteger(i) && !!collection.items[i]) &&
          new Set(indices).size === indices.length,
      ),
    );
    assert.equal(
      new Set(collection.items.map((v) => v.id)).size,
      collection.items.length,
    );
    const primary = playlists.find(
      (p) => p.playlistId === collection.coursePlaylistId,
    )!;
    assert.equal(primary.grade, topic.grade);
    assert.equal(primary.subject, courseSubject(topic));
    for (const video of collection.items) {
      const source = playlists.find((p) => p.playlistId === video.playlistId)!;
      assert.ok(source, topic.id);
      const item = source.videos.find((v) => v.id === video.id);
      assert.equal(item?.title, video.sourceTitle, `${topic.id}: ${video.id}`);
      assert.equal(video.sourceGrade, source.grade);
      assert.ok(video.title.trim());
      assert.ok(/^\d+:\d{2}(?::\d{2})?$/.test(video.duration), video.id);
      const watch = new URL(youtubeWatchUrl(video));
      assert.equal(watch.searchParams.get("v"), video.id);
      assert.equal(watch.searchParams.get("list"), video.playlistId);
    }
  }
});

test("YouTube embeds use actual video IDs and never autoplay", () => {
  const id = courseVideos["A06-02"].items[0].id;
  const embed = new URL(youtubeEmbedUrl(id));
  assert.equal(embed.hostname, "www.youtube-nocookie.com");
  assert.equal(embed.pathname, `/embed/${id}`);
  assert.equal(embed.searchParams.get("autoplay"), "0");
  for (const invalid of [
    "",
    "../script",
    'id" onload=alert(1)',
    "https://youtube.com/watch?v=123",
  ]) {
    assert.throws(() => youtubeEmbedUrl(invalid));
  }
});

test("junior mathematics has one sequence including geometry and keeps original progress IDs", () => {
  for (const grade of [5, 6]) {
    const sequence = course.filter((t) => t.grade === grade);
    assert.equal(new Set(sequence.map(courseSubject)).size, 1);
    assert.ok(sequence.some((t) => t.id.startsWith("A")));
    assert.ok(sequence.some((t) => t.id.startsWith("G")));
  }
  assert.equal(
    courseSubject(course.find((t) => t.id === "G07-01")!),
    "geometry",
  );
});

test("unrelated fallback videos are never presented as explanations for a part", () => {
  assert.deepEqual(videosForPage("G05-02", 2), []); // Volume is not rectangle area.
  assert.deepEqual(videosForPage("A06-06", 2), []); // Mixtures are not solving a proportion.
  assert.deepEqual(videosForPage("A05-03", 3), []); // Pursuit is not a general formula video.
  assert.equal(videosForPage("A06-03", 3)[0].title, "Сложение и вычитание");
  assert.equal(videosForPage("A06-03", 4)[0].title, "Умножение");
  assert.equal(
    videosForPage("A06-03", 5)[0].title,
    "Деление десятичных дробей",
  );
  assert.equal(videosForPage("G08-01", 2).length, 3); // Rectangle, rhombus and square.
  assert.equal(videosForPage("G11-01", 3).length, 2); // Cylinder AND cone.
  assert.deepEqual(videosForPage("missing", 0), []);
  assert.deepEqual(videosForPage("G05-02", 99), []);
});
