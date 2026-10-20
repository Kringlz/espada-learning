// Exercises separate database connections against disposable local fixtures only.
import assert from 'node:assert/strict';
import { sql, quote, actors, requireDisposableDatabase } from './lesson-db.mjs';
requireDisposableDatabase();
const group = '00000000-0000-4000-8000-000000000006';
const rpc = async (actor, name, args) => JSON.parse(await sql(`begin;set local role authenticated;set local request.jwt.claim.sub=${quote(actor)};select public.${name}(${args});commit;`));
let room;
try {
  const creates = await Promise.all(Array.from({length: 6}, () => rpc(actors.student,'arena_create',`${quote(group)},'arithmetic'`)));
  assert.equal(new Set(creates.map(x => x.id)).size,1);
  room = creates[0];
  const joins = await Promise.all(Array.from({length: 6}, () => rpc(actors.other,'arena_join',quote(room.code))));
  assert.ok(joins.every(x => x.players.length === 2));
  const starts = await Promise.all(Array.from({length: 4}, () => rpc(actors.student,'arena_start',quote(room.id))));
  assert.equal(new Set(starts.map(x => x.startsAt)).size,1);
  console.log('✓ simultaneous create, join and start requests are idempotent across connections');
  const questions = JSON.parse(await sql(`select questions from public.arena_rooms where id=${quote(room.id)}`));
  for(let round=0;round<10;round++) {
    await sql(`update public.arena_rooms set starts_at=clock_timestamp()-make_interval(secs=>${round*18+1}) where id=${quote(room.id)}`);
    const read = await rpc(actors.other,'arena_snapshot',quote(room.id));
    assert.equal(read.round,round); assert.equal(read.phase,'question');
    assert.equal(read.question.answer,undefined); assert.equal(read.question.explanation,undefined);
    const correct = questions[round].answer;
    const replies = await Promise.all(Array.from({length: 5},()=>rpc(actors.student,'arena_answer',`${quote(room.id)},${round},${correct}`)));
    assert.ok(replies.every(x=>x.myAnswer.choice===correct));
    await rpc(actors.other,'arena_answer',`${quote(room.id)},${round},${(correct+1)%4}`);
  }
  assert.equal(Number(await sql(`select count(*) from public.arena_answers where room_id=${quote(room.id)}`)),20);
  await sql(`update public.arena_rooms set starts_at=clock_timestamp()-interval '181 seconds' where id=${quote(room.id)}`);
  const [first,second,leaderboard] = await Promise.all([
    rpc(actors.student,'arena_snapshot',quote(room.id)), rpc(actors.other,'arena_snapshot',quote(room.id)), rpc(actors.teacher,'arena_leaderboard',quote(group))
  ]);
  assert.equal(first.phase,'finished'); assert.equal(second.phase,'finished');
  assert.deepEqual(first.players,second.players);
  assert.ok(first.review.every(x=>x.choice===x.answer&&x.points>0));
  assert.ok(second.review.every(x=>x.choice!==x.answer&&x.points===0));
  assert.equal(leaderboard.find(x=>x.id===actors.student).points,first.players.find(x=>x.id===actors.student).points);
  assert.equal(leaderboard.find(x=>x.id===actors.other).points,0);
  assert.equal(leaderboard[0].id,actors.student);
  console.log('✓ full 10-round match: two clients, 50 racing retries, identical final scores and group leaderboard');
} finally {
  if(room) await sql(`delete from public.arena_rooms where id=${quote(room.id)}`);
}
for(const topic of ['percent','equations']) {
  const r = await rpc(actors.teacher,'arena_create',`${quote(group)},${quote(topic)}`);
  try {
    const questions = JSON.parse(await sql(`select questions from public.arena_rooms where id=${quote(r.id)}`));
    for(const q of questions) {
      const numbers = q.prompt.match(/\d+/g).map(Number);
      const answer = Number(q.choices[q.answer]);
      assert.equal(new Set(q.choices).size,4);
      if(topic==='percent') assert.equal(numbers[0]*numbers[1]/100,answer);
      else assert.equal(numbers[0]*answer+numbers[1],numbers[2]);
    }
  } finally { await sql(`delete from public.arena_rooms where id=${quote(r.id)}`); }
}
console.log('✓ server-generated percentage and equation questions are mathematically valid');
