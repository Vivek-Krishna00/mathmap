export const RESOURCE_TYPES = ['video', 'article', 'game', 'simulation', 'problem_set', 'application', 'course', 'book'];

export const RESOURCE_TYPE_LABELS = {
  video: 'Video',
  article: 'Article',
  game: 'Game',
  simulation: 'Simulation',
  problem_set: 'Problem set',
  application: 'Application',
  course: 'Course',
  book: 'Book',
};

/** What the learner does with it — reads better on a resource card than a noun. */
export const RESOURCE_TYPE_VERB = {
  video: 'Watch',
  article: 'Read',
  game: 'Play',
  simulation: 'Explore',
  problem_set: 'Try it',
  application: 'Try it',
  course: 'Study',
  book: 'Read',
};

export const RESOURCE_TYPE_ICON = {
  video: 'play',
  article: 'doc',
  game: 'gamepad',
  simulation: 'flask',
  problem_set: 'puzzle',
  application: 'rocket',
  course: 'cap',
  book: 'book',
};

export const DIFFICULTY_LABELS = {
  1: 'Introductory',
  2: 'Easy',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export const DIFFICULTY_TONE = {
  1: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
  2: 'bg-teal-600/12 text-teal-700 dark:text-teal-300',
  3: 'bg-accent-500/15 text-accent-700 dark:text-accent-300',
  4: 'bg-orange-800/12 text-orange-800 dark:text-orange-300',
  5: 'bg-rose-700/12 text-rose-800 dark:text-rose-300',
};

export const LEVELS = [
  { value: 'beginner', label: 'Beginner', blurb: 'New to the subject' },
  { value: 'intermediate', label: 'Intermediate', blurb: 'Know the basics' },
  { value: 'advanced', label: 'Advanced', blurb: 'Ready for depth' },
];

export const LENGTHS = [
  { value: 'short', label: 'Quick sprint', blurb: '~8 topics' },
  { value: 'medium', label: 'Steady path', blurb: '~15 topics' },
  { value: 'long', label: 'Deep dive', blurb: '~25 topics' },
];

export const ITEM_STATUS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export const ROLE_LABELS = {
  learner: 'Learner',
  contributor: 'Contributor',
  moderator: 'Moderator',
  admin: 'Admin',
};

export const ROLE_TONE = {
  learner: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
  contributor: 'bg-brand-600/12 text-brand-700 dark:text-brand-300',
  moderator: 'bg-accent-500/15 text-accent-700 dark:text-accent-300',
  admin: 'bg-rose-700/12 text-rose-800 dark:text-rose-300',
};

export const formatMinutes = (mins) => {
  if (!mins) return '';
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
};

export const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const hostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const titleCase = (value = '') => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
