import test from 'node:test';
import assert from 'node:assert/strict';
import { levelFromRatio, difficultyBand, scorePlacement } from '../services/placement.js';

const QUESTIONS = [
  { id: 1, branch_id: 1, branch_slug: 'linear-algebra', branch_name: 'Linear Algebra', correct_index: 1 },
  { id: 2, branch_id: 1, branch_slug: 'linear-algebra', branch_name: 'Linear Algebra', correct_index: 0 },
  { id: 3, branch_id: 1, branch_slug: 'linear-algebra', branch_name: 'Linear Algebra', correct_index: 2 },
  { id: 4, branch_id: 1, branch_slug: 'linear-algebra', branch_name: 'Linear Algebra', correct_index: 3 },
  { id: 5, branch_id: 2, branch_slug: 'probability', branch_name: 'Probability', correct_index: 1 },
  { id: 6, branch_id: 2, branch_slug: 'probability', branch_name: 'Probability', correct_index: 2 },
];

test('levelFromRatio maps the 0-1 / 2-3 / 4 bands', () => {
  assert.equal(levelFromRatio(0, 4), 'beginner');
  assert.equal(levelFromRatio(1, 4), 'beginner');
  assert.equal(levelFromRatio(2, 4), 'intermediate');
  assert.equal(levelFromRatio(3, 4), 'intermediate');
  assert.equal(levelFromRatio(4, 4), 'advanced');
  assert.equal(levelFromRatio(0, 0), 'beginner');
});

test('difficultyBand stays inside 1-5', () => {
  assert.deepEqual(difficultyBand('beginner'), [1, 3]);
  assert.deepEqual(difficultyBand('intermediate'), [2, 4]);
  assert.deepEqual(difficultyBand('advanced'), [3, 5]);
});

test('scorePlacement counts correct answers per branch', () => {
  const result = scorePlacement(QUESTIONS, [
    { questionId: 1, choiceIndex: 1 }, // correct
    { questionId: 2, choiceIndex: 0 }, // correct
    { questionId: 3, choiceIndex: 0 }, // wrong
    { questionId: 4, choiceIndex: 0 }, // wrong
    { questionId: 5, choiceIndex: 1 }, // correct
    { questionId: 6, choiceIndex: 0 }, // wrong
  ]);

  assert.equal(result.totalAnswered, 6);
  assert.equal(result.totalCorrect, 3);

  const la = result.branches.find((b) => b.slug === 'linear-algebra');
  const pr = result.branches.find((b) => b.slug === 'probability');
  assert.equal(la.correct, 2);
  assert.equal(la.total, 4);
  assert.equal(la.advisedLevel, 'intermediate');
  assert.equal(pr.correct, 1);
  // Ratio-based, so with the 2 questions in this fixture 1/2 is intermediate.
  // The real check always serves 4 per branch, giving the 0-1 / 2-3 / 4 bands.
  assert.equal(pr.advisedLevel, 'intermediate');

  // Strongest branch first.
  assert.equal(result.branches[0].slug, 'linear-algebra');
});

test('a perfect score advises advanced', () => {
  const answers = QUESTIONS.map((q) => ({ questionId: q.id, choiceIndex: q.correct_index }));
  const result = scorePlacement(QUESTIONS, answers);
  assert.equal(result.totalCorrect, 6);
  assert.equal(result.advisedLevel, 'advanced');
  assert.ok(result.branches.every((b) => b.advisedLevel === 'advanced'));
});

test('suggested branches ignore those with no correct answers, but never go empty', () => {
  const someHits = scorePlacement(QUESTIONS, [
    { questionId: 1, choiceIndex: 1 },
    { questionId: 5, choiceIndex: 0 },
  ]);
  assert.deepEqual(someHits.suggestedBranchIds, [1]);

  const noHits = scorePlacement(QUESTIONS, [
    { questionId: 1, choiceIndex: 0 },
    { questionId: 5, choiceIndex: 0 },
  ]);
  assert.equal(noHits.totalCorrect, 0);
  assert.deepEqual(noHits.suggestedBranchIds.sort(), [1, 2]);
});

test('unknown question ids and unanswered questions are ignored', () => {
  const result = scorePlacement(QUESTIONS, [
    { questionId: 999, choiceIndex: 1 },
    { questionId: 1, choiceIndex: 1 },
  ]);
  assert.equal(result.totalAnswered, 1);
  assert.equal(result.totalCorrect, 1);
});
