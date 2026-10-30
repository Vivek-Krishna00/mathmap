// Placement self-check: four multiple-choice questions per branch.
// Correct answers drive the advised level; `difficulty` spans 1-4 so the score
// discriminates between beginners and people who already know the material.
export default [
  // ---------------------------------------------------------------- Linear Algebra
  { branch: 'linear-algebra', difficulty: 1, correctIndex: 1, prompt: 'What is the dot product of (1, 2) and (3, 4)?', options: ['10', '11', '7', '12'], explanation: '1x3 + 2x4 = 11.' },
  { branch: 'linear-algebra', difficulty: 2, correctIndex: 2, prompt: 'Which statement about matrix multiplication is correct?', options: ['It is commutative', 'It is associative but not commutative in general', 'It is neither associative nor commutative', 'Every product has an inverse'], explanation: 'AB and BA are generally different, but (AB)C = A(BC).' },
  { branch: 'linear-algebra', difficulty: 3, correctIndex: 1, prompt: 'A square matrix has an eigenvalue of 0. What follows?', options: ['It is invertible', 'It is singular (not invertible)', 'Its determinant is 1', 'It is orthogonal'], explanation: 'A zero eigenvalue means the determinant is 0, so the matrix is singular.' },
  { branch: 'linear-algebra', difficulty: 4, correctIndex: 2, prompt: 'In the singular value decomposition M = U S V^T, what is S?', options: ['An orthogonal matrix', 'A symmetric matrix', 'A diagonal matrix of non-negative singular values', 'An upper-triangular matrix'], explanation: 'S is diagonal and holds the singular values, which are never negative.' },

  // ---------------------------------------------------------------- Probability
  { branch: 'probability', difficulty: 1, correctIndex: 1, prompt: 'Two fair coins are tossed. What is the probability of exactly one head?', options: ['1/4', '1/2', '3/4', '1/3'], explanation: 'HT and TH out of four equally likely outcomes.' },
  { branch: 'probability', difficulty: 2, correctIndex: 0, prompt: 'Which expression defines P(A given B)?', options: ['P(A n B) / P(B)', 'P(B given A)', 'P(A) x P(B)', 'P(A u B)'], explanation: 'Conditional probability normalises the joint probability by P(B).' },
  { branch: 'probability', difficulty: 3, correctIndex: 1, prompt: 'What is the expected value of a single roll of a fair six-sided die?', options: ['3', '3.5', '4', '6'], explanation: '(1+2+3+4+5+6)/6 = 3.5.' },
  { branch: 'probability', difficulty: 4, correctIndex: 1, prompt: 'The central limit theorem states that the sample mean becomes approximately normal as the sample grows, provided that:', options: ['The population is already normal', 'The population has finite variance, whatever its shape', 'The population is symmetric', 'The variable is discrete'], explanation: 'The CLT needs independence and finite variance, not normality of the population.' },

  // ---------------------------------------------------------------- Statistics
  { branch: 'statistics', difficulty: 1, correctIndex: 1, prompt: 'Which summary is least affected by extreme outliers?', options: ['Mean', 'Median', 'Range', 'Standard deviation'], explanation: 'The median depends only on position, not magnitude.' },
  { branch: 'statistics', difficulty: 2, correctIndex: 1, prompt: 'A 95% confidence interval means:', options: ['There is a 95% probability the true parameter lies in this interval', 'If we repeated the sampling, about 95% of such intervals would contain the parameter', '95% of the data lies inside the interval', 'The estimate is 95% accurate'], explanation: 'The confidence is a property of the procedure, not of one realised interval.' },
  { branch: 'statistics', difficulty: 3, correctIndex: 1, prompt: 'A test returns p = 0.03. What does that mean?', options: ['There is a 3% chance the null hypothesis is true', 'Data at least this extreme would occur 3% of the time if the null were true', 'The effect is 3% large', 'We are 97% confident in the result'], explanation: 'A p-value is calculated assuming the null hypothesis is true.' },
  { branch: 'statistics', difficulty: 4, correctIndex: 1, prompt: 'In simple linear regression, what does R squared measure?', options: ['The slope of the line', 'The proportion of variance in the response explained by the model', 'That the relationship is causal', 'The average residual'], explanation: 'R squared is explained variance over total variance.' },

  // ---------------------------------------------------------------- Calculus
  { branch: 'calculus', difficulty: 1, correctIndex: 0, prompt: 'What is the derivative of x cubed with respect to x?', options: ['3x squared', 'x squared', '3x', '2x cubed'], explanation: 'The power rule: bring down the exponent and reduce it by one.' },
  { branch: 'calculus', difficulty: 2, correctIndex: 0, prompt: 'Evaluate the definite integral of 2x from 0 to 1.', options: ['1', '2', '0.5', '4'], explanation: 'x squared evaluated from 0 to 1 equals 1.' },
  { branch: 'calculus', difficulty: 3, correctIndex: 0, prompt: 'What is the chain rule for the derivative of f(g(x))?', options: ["f'(g(x)) x g'(x)", "f'(x) x g'(x)", "f(g'(x))", "f'(g'(x))"], explanation: 'Differentiate the outer function, then multiply by the inner derivative.' },
  { branch: 'calculus', difficulty: 4, correctIndex: 1, prompt: 'A twice-differentiable function has a local maximum at x = a when:', options: ["f''(a) > 0", "f'(a) = 0 and f''(a) < 0", "f'(a) > 0", "f(a) = 0"], explanation: 'A stationary point with downward curvature is a local maximum.' },

  // ---------------------------------------------------------------- Number Theory
  { branch: 'number-theory', difficulty: 1, correctIndex: 2, prompt: 'Which of these numbers is prime?', options: ['91', '87', '89', '99'], explanation: '89 has no factors other than 1 and itself; 91 = 7 x 13.' },
  { branch: 'number-theory', difficulty: 2, correctIndex: 0, prompt: 'What is the greatest common divisor of 48 and 18?', options: ['6', '12', '3', '24'], explanation: '48 = 2^4 x 3 and 18 = 2 x 3^2, so the gcd is 6.' },
  { branch: 'number-theory', difficulty: 3, correctIndex: 0, prompt: 'What is 3 to the power 4 modulo 5?', options: ['1', '2', '3', '4'], explanation: '81 divided by 5 leaves remainder 1.' },
  { branch: 'number-theory', difficulty: 4, correctIndex: 1, prompt: "Fermat's little theorem states that for a prime p not dividing a:", options: ['a to the p is congruent to a (mod p)', 'a to the (p-1) is congruent to 1 (mod p)', 'a to the p is congruent to 0 (mod p)', 'a to the (p+1) is congruent to a (mod p)'], explanation: 'This is the result that makes modular exponentiation and RSA work.' },

  // ---------------------------------------------------------------- Discrete Mathematics
  { branch: 'discrete-mathematics', difficulty: 1, correctIndex: 1, prompt: 'How many subsets does a set with 3 elements have?', options: ['6', '8', '9', '3'], explanation: 'Each element is either in or out: 2 cubed = 8.' },
  { branch: 'discrete-mathematics', difficulty: 2, correctIndex: 1, prompt: 'A connected graph with n vertices and no cycles has how many edges?', options: ['n', 'n - 1', 'n + 1', '2n'], explanation: 'That is exactly what makes it a tree.' },
  { branch: 'discrete-mathematics', difficulty: 3, correctIndex: 1, prompt: 'In any undirected graph, the sum of all vertex degrees equals:', options: ['The number of edges', 'Twice the number of edges', 'Half the number of edges', 'The number of vertices'], explanation: 'Every edge contributes to the degree of both of its endpoints.' },
  { branch: 'discrete-mathematics', difficulty: 4, correctIndex: 0, prompt: 'A connected graph has an Euler circuit exactly when:', options: ['Every vertex has even degree', 'Exactly two vertices have odd degree', 'It is a tree', 'It is bipartite'], explanation: 'You must be able to enter and leave every vertex; two odd vertices gives a path, not a circuit.' },
];
