// Applied goals ("tracks"). Each is a real-world destination mapped onto the
// existing maths graph — no duplicated content, just a curated lens per goal.
export default [
  {
    slug: 'cryptography',
    name: 'Cryptography & Security',
    tagline: 'How primes and congruences keep secrets',
    description:
      'Cryptography is number theory with consequences. Modular arithmetic, Fermat and Euler, and quadratic residues are exactly the machinery behind RSA and modern key exchange.',
    icon: 'shield',
    color: '#6E4A9C',
    sortOrder: 1,
    topics: ['nt-divisibility', 'nt-gcd-euclid', 'nt-modular-arithmetic', 'nt-euler-fermat', 'nt-primitive-roots', 'nt-quadratic-residues', 'nt-cryptography', 'dm-sets-logic', 'dm-automata', 'pr-axioms'],
  },
  {
    slug: 'machine-learning',
    name: 'Machine Learning & AI',
    tagline: 'Linear algebra, gradients and probability',
    description:
      'Every model is a stack of vectors, matrices and gradients. Vectors through the SVD give you the geometry, calculus gives you training, and probability gives you the loss functions.',
    icon: 'sparkles',
    color: '#2E6FB4',
    sortOrder: 2,
    topics: ['la-vectors', 'la-vector-operations', 'la-matrices', 'la-linear-transformations', 'la-eigenvalues', 'la-svd', 'la-applications', 'ca-derivatives', 'ca-differentiation-rules', 'ca-multivariable', 'ca-applications', 'pr-axioms', 'pr-random-variables', 'pr-expectation', 'pr-bayes', 'st-descriptive', 'st-estimation', 'st-regression', 'st-multiple-regression'],
  },
  {
    slug: 'game-development',
    name: 'Game Development',
    tagline: 'Transforms, physics and pathfinding',
    description:
      'Games are applied linear algebra and calculus: transform hierarchies, rotation, collision, integration for motion, plus graph search for navigation.',
    icon: 'gamepad',
    color: '#B4761A',
    sortOrder: 3,
    topics: ['la-vectors', 'la-vector-operations', 'la-matrices', 'la-linear-transformations', 'la-eigenvalues', 'ca-limits', 'ca-derivatives', 'ca-applications-derivatives', 'ca-integrals', 'ca-applications', 'dm-graph-theory', 'dm-connectivity', 'dm-trees', 'pr-counting', 'pr-random-variables'],
  },
  {
    slug: 'app-development',
    name: 'Application & Web Development',
    tagline: 'Logic, graphs and experimentation',
    description:
      'Good application work rests on discrete maths: logic and proofs for correctness, graphs for data models, combinatorics for complexity, and statistics for experiments.',
    icon: 'grid',
    color: '#177F73',
    sortOrder: 4,
    topics: ['dm-sets-logic', 'dm-relations-functions', 'dm-graph-theory', 'dm-combinatorics', 'dm-recurrence', 'dm-boolean-algebra', 'st-descriptive', 'st-hypothesis-testing', 'st-applications', 'la-vectors', 'la-matrices', 'nt-modular-arithmetic', 'nt-gcd-euclid', 'ca-derivatives'],
  },
  {
    slug: 'mlops',
    name: 'MLOps & Data Engineering',
    tagline: 'Pipelines, drift and model evaluation',
    description:
      'Keeping models alive in production is statistics and graphs: estimation and intervals to detect drift, DAGs to reason about pipelines, and calculus to understand retraining.',
    icon: 'layers',
    color: '#4B5563',
    sortOrder: 5,
    topics: ['la-vectors', 'la-matrices', 'la-svd', 'la-applications', 'st-estimation', 'st-confidence-intervals', 'st-multiple-regression', 'st-applications', 'pr-expectation', 'pr-limit-theorems', 'pr-common-distributions', 'ca-derivatives', 'ca-multivariable', 'ca-applications', 'dm-graph-theory'],
  },
  {
    slug: 'data-science',
    name: 'Data Science & Analytics',
    tagline: 'From summaries to regression',
    description:
      'The statistics track: summarise data honestly, estimate with intervals, test hypotheses, and build regression models you can defend.',
    icon: 'chart',
    color: '#B5495B',
    sortOrder: 6,
    topics: ['st-descriptive', 'st-sampling', 'st-estimation', 'st-confidence-intervals', 'st-hypothesis-testing', 'st-t-tests-anova', 'st-regression', 'st-multiple-regression', 'st-applications', 'pr-axioms', 'pr-conditional', 'pr-bayes', 'pr-random-variables', 'pr-common-distributions', 'la-vectors', 'la-matrices', 'la-applications', 'ca-applications'],
  },
  {
    slug: 'computer-graphics',
    name: 'Computer Graphics & Simulation',
    tagline: 'Transforms, shading and vector fields',
    description:
      'Rendering is linear algebra end to end, and the lighting models on top are vector calculus.',
    icon: 'nodes',
    color: '#0E2A4E',
    sortOrder: 7,
    topics: ['la-vectors', 'la-vector-operations', 'la-matrices', 'la-linear-transformations', 'la-eigenvalues', 'ca-derivatives', 'ca-multivariable', 'ca-vector-calculus', 'ca-applications', 'dm-graph-theory'],
  },
  {
    slug: 'quant-finance',
    name: 'Quantitative Finance & Risk',
    tagline: 'Uncertainty, pricing and stochastic models',
    description:
      'Quant work is probability in high gear: random variables and expectation, limit theorems, Markov models, and the calculus behind continuous-time pricing.',
    icon: 'dice',
    color: '#96600F',
    sortOrder: 8,
    topics: ['pr-axioms', 'pr-random-variables', 'pr-expectation', 'pr-common-distributions', 'pr-limit-theorems', 'pr-markov-chains', 'pr-applications', 'st-descriptive', 'st-estimation', 'st-regression', 'ca-derivatives', 'ca-integrals', 'ca-differential-equations', 'la-matrices'],
  },
  {
    slug: 'operations-research',
    name: 'Operations Research & Optimization',
    tagline: 'Networks, linear programs and queues',
    description:
      'Optimisation sits where linear algebra, calculus and discrete maths meet: systems of equations for linear programs, gradients for nonlinear ones, graphs for networks and flow.',
    icon: 'route',
    color: '#2E6FB4',
    sortOrder: 9,
    topics: ['la-linear-systems', 'la-linear-transformations', 'la-vector-spaces', 'ca-applications-derivatives', 'ca-multivariable', 'dm-graph-theory', 'dm-trees', 'dm-connectivity', 'pr-axioms', 'pr-expectation', 'pr-markov-chains', 'st-descriptive'],
  },
];
