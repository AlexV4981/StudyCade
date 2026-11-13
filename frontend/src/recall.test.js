import test from "node:test";
import assert from "node:assert/strict";
import { recallDelay, recallPool, recallQuestion, resolveRecall } from "./recall.js";

test("recallDelay bounds injected random values to the 3–10 minute range", () => {
  assert.equal(recallDelay(() => 0), 180000);
  assert.equal(recallDelay(() => 0.5), 390000);
  assert.equal(recallDelay(() => 1), 600000);
  assert.equal(recallDelay(() => Number.NaN), 390000);
  assert.equal(recallDelay(() => -4), 180000);
});
test("recallPool selects cards and keeps deck IDs namespaced", () => {
  const pool = recallPool([
    {id:"deck-a", title:"A", cards:[{id:"same",term:"A",definition:"One"},{id:"other",term:"B",definition:"Two"}]},
    {id:"deck-b", title:"B", cards:[{id:"same",term:"C",definition:"Three"}]},
  ],{"deck-a":["same"],"deck-b":["same"]});
  assert.equal(pool.length,2);
  assert.notEqual(pool[0].id,pool[1].id);
  assert.equal(pool[1].deckTitle,"B");
});
test("recallQuestion rejects ambiguous decks and selects unique answer", () => {
  assert.equal(recallQuestion([{id:"a",term:"x",definition:"same"},{id:"b",term:"y",definition:"same"}]),null);
  const pool=[
    {id:"a",term:"Alpha",definition:"One"},
    {id:"b",term:"Beta",definition:"Two"},
    {id:"c",term:"Gamma",definition:"Three"},
  ];
  const result=recallQuestion(pool,null,()=>0);
  assert.ok(result);
  assert.equal(result.options.filter(x=>x.correct).length,1);
  assert.equal(result.options.length,3);
});
test("resolveRecall preserves state for invalid answers and settles valid/expired questions", () => {
  const q={deadline:100,options:[{id:"a",correct:true},{id:"b",correct:false}]};
  assert.equal(resolveRecall(q,"missing",20),q);
  const right=resolveRecall(q,"a",20);
  assert.equal(right.correct,true);
  assert.equal(resolveRecall(right,"b",20),right);
  const expired=resolveRecall(q,"a",101);
  assert.equal(expired.timedOut,true);
  assert.equal(expired.chosen,null);
});
