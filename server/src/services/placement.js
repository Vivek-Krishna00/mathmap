/**
 * Placement self-check scoring.
 *
 * Pure and deterministic so it can be unit tested: given the questions a learner
 * answered and the choices they made, work out their level per branch and overall.
 */

export const LEVELS = ['beginner', 'intermediate', 'advanced'];

/**
 * 0-25% correct -> beginner, anything short of perfect -> intermediate, 100% -> advanced.
 * With four questions per branch that is 0-1 / 2-3 / 4.
 */
export function levelFromRatio(correct, total) {
  if (!total) return 'beginner';
  const ratio = correct / total;
  if (ratio <= 0.25) return 'beginner';
  if (ratio >= 1) return 'advanced';
  return 'intermediate';
}

/** The difficulty band we suggest topics from, for a given advised level. */
export function difficultyBand(level) {
  const target = { beginner: 2, intermediate: 3, advanced: 4 }[level] ?? 3;
  return [Math.max(1, target - 1), Math.min(5, target + 1)];
}

/**
 * @param {Array} questions rows of { id, branch_id, branch_slug, branch_name, correct_index }
 * @param {Array} answers   [{ questionId, choiceIndex }]
 */
export function scorePlacement(questions, answers) {
  const byId = new Map(questions.map((q) => [Number(q.id), q]));
  const perBranch = new Map();
  let totalCorrect = 0;
  let totalAnswered = 0;

  for (const answer of answers) {
    const question = byId.get(Number(answer.questionId));
    if (!question) continue;

    const correct = Number(question.correct_index) === Number(answer.choiceIndex);
    totalAnswered += 1;
    if (correct) totalCorrect += 1;

    const slug = question.branch_slug;
    if (!perBranch.has(slug)) {
      perBranch.set(slug, {
        slug,
        name: question.branch_name,
        branchId: question.branch_id,
        correct: 0,
        total: 0,
      });
    }
    const entry = perBranch.get(slug);
    entry.total += 1;
    if (correct) entry.correct += 1;
  }

  const branches = [...perBranch.values()]
    .map((b) => ({ ...b, advisedLevel: levelFromRatio(b.correct, b.total), ratio: b.total ? b.correct / b.total : 0 }))
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));

  const advisedLevel = levelFromRatio(totalCorrect, totalAnswered);

  // Prefer branches where they actually got something right; if they scored zero
  // everywhere, still suggest everything they attempted so the roadmap isn't empty.
  const withHits = branches.filter((b) => b.correct > 0).map((b) => b.branchId);
  const suggestedBranchIds = withHits.length ? withHits : branches.map((b) => b.branchId);

  return { totalCorrect, totalAnswered, advisedLevel, branches, suggestedBranchIds };
}
