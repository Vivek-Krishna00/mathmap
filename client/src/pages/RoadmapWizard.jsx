import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import TagPicker from '../components/TagPicker.jsx';
import { Icon, BRANCH_ICONS } from '../components/icons.jsx';
import { Button, Card, DifficultyPill, ErrorState, Loading, Textarea, cx } from '../components/ui.jsx';
import { LENGTHS, LEVELS, formatMinutes } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const STEPS = ['Branches', 'Level & pace', 'Goals', 'Preview'];

export default function RoadmapWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const placement = location.state?.placement || null;
  const { isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const [step, setStep] = useState(0);
  const [appliedPlacement, setAppliedPlacement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [form, setForm] = useState({
    branchSlugs: [],
    trackIds: [],
    level: 'beginner',
    length: 'medium',
    goal: '',
    interestTags: [],
  });

  const { data: branchData } = useFetch(() => api('/branches'), []);
  const { data: trackData } = useFetch(() => api('/tracks'), []);
  const { data: tagData } = useFetch(() => api('/topics/tags'), []);
  const branches = branchData?.branches || [];
  const tracks = trackData?.tracks || [];

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const presetTrackSlug = location.state?.trackSlug || null;
  const [appliedTrack, setAppliedTrack] = useState(false);

  useEffect(() => {
    if (!presetTrackSlug || appliedTrack || tracks.length === 0) return;
    const match = tracks.find((t) => t.slug === presetTrackSlug);
    if (match) {
      setForm((prev) => ({ ...prev, trackIds: [match.id] }));
      setStep(1);
    }
    setAppliedTrack(true);
  }, [presetTrackSlug, appliedTrack, tracks]);

  // Apply a placement result once the branch list is available: it sets the level,
  // preselects the branches they scored in, and seeds the interest tags.
  useEffect(() => {
    if (!placement || appliedPlacement || branches.length === 0) return;
    const slugs = (placement.suggestedBranchIds || [])
      .map((branchId) => branches.find((b) => b.id === branchId)?.slug)
      .filter(Boolean);
    setForm((prev) => ({
      ...prev,
      level: placement.advisedLevel || prev.level,
      branchSlugs: slugs.length ? slugs : prev.branchSlugs,
      interestTags: placement.suggestedTags?.length ? placement.suggestedTags : prev.interestTags,
    }));
    setStep(2);
    setAppliedPlacement(true);
  }, [placement, appliedPlacement, branches]);

  const selectedBranchIds = useMemo(
    () => form.branchSlugs.map((slug) => branches.find((b) => b.slug === slug)?.id).filter(Boolean),
    [form.branchSlugs, branches],
  );

  const payload = () => ({
    branchIds: selectedBranchIds,
    trackIds: form.trackIds,
    level: form.level,
    length: form.length,
    goal: form.goal,
    interestTags: form.interestTags,
  });

  const canContinue = step !== 0 || form.branchSlugs.length > 0 || form.trackIds.length > 0;

  const toggleTrack = (trackId) =>
    update({
      trackIds: form.trackIds.includes(trackId)
        ? form.trackIds.filter((id) => id !== trackId)
        : [...form.trackIds, trackId],
    });

  const toggleBranch = (slug) =>
    update({
      branchSlugs: form.branchSlugs.includes(slug)
        ? form.branchSlugs.filter((s) => s !== slug)
        : [...form.branchSlugs, slug],
    });

  const runPreview = async () => {
    setPreviewing(true);
    setPreviewError(null);
    try {
      const data = await api('/roadmaps/preview', { method: 'POST', body: payload() });
      setPreview(data.roadmap);
      setStep(3);
    } catch (err) {
      setPreviewError(err);
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/roadmaps/new' } });
      return;
    }
    setSaving(true);
    try {
      const data = await api('/roadmaps', { method: 'POST', body: payload() });
      success('Roadmap saved to your dashboard.', 'Nice choice!');
      navigate(`/roadmaps/${data.roadmap.id}`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <h1 className="section-title">Build your roadmap</h1>
        <p className="text-muted mt-2">Answer a few questions and we&apos;ll assemble a prerequisite-aware path just for you.</p>
      </header>

      {/* stepper */}
      {form.trackIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Goal{form.trackIds.length > 1 ? 's' : ''}
          </span>
          {tracks
            .filter((track) => form.trackIds.includes(track.id))
            .map((track) => (
              <span key={track.id} className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300">
                <Icon name={track.icon || 'target'} size={12} /> {track.name}
              </span>
            ))}
        </div>
      )}

      {placement && appliedPlacement && (
        <div className="card p-4 mb-6 flex items-start gap-3">
          <Icon name="checkCircle" size={18} className="text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Prefilled from your placement check</p>
            <p className="text-muted mt-0.5">
              You answered {placement.correct} of {placement.total} correctly, which set your level to{' '}
              <span className="capitalize">{placement.advisedLevel}</span> and preselected{' '}
              {form.branchSlugs.length} branch{form.branchSlugs.length === 1 ? '' : 'es'}.
            </p>
          </div>
        </div>
      )}

      <ol className="flex items-center gap-2 mb-8 overflow-x-auto">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cx(
                'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'bg-sunken text-muted',
              )}
            >
              <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
                {i < step ? <Icon name="check" size={12} /> : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="w-6 h-px bg-line" />}
          </li>
        ))}
      </ol>

      <Card className="p-6 sm:p-8">
        {step === 0 && (
          <div className="animate-fade-up">
            <h2 className="text-xl font-semibold">What do you want to do?</h2>
            <p className="text-muted text-sm mt-1.5">
              Pick a goal and we&apos;ll pull in the mathematics it actually needs.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
              {tracks.map((track) => {
                const active = form.trackIds.includes(track.id);
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => toggleTrack(track.id)}
                    className={cx(
                      'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                      active ? 'border-brand-500 bg-brand-500/5' : 'border-line hover:border-brand-400/60',
                    )}
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${track.color}1f`, color: track.color }}
                    >
                      <Icon name={track.icon || 'target'} size={20} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{track.name}</span>
                        {active && <Icon name="checkCircle" size={18} className="text-brand-500" />}
                      </span>
                      <span className="block text-xs text-muted mt-1">{track.tagline}</span>
                      <span className="block text-[11px] text-muted mt-1.5">
                        {track.topic_count} concepts · {track.branch_count} branches
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <h2 className="text-xl font-semibold mt-10">Or study a subject</h2>
            <p className="text-muted text-sm mt-1.5">Prefer to choose the branches yourself? Pick them here.</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {branches.map((branch, i) => {
                const active = form.branchSlugs.includes(branch.slug);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => toggleBranch(branch.slug)}
                    className={cx(
                      'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                      active ? 'border-brand-500 bg-brand-500/5' : 'border-line hover:border-brand-400/60',
                    )}
                  >
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${branch.color}1f`, color: branch.color }}>
                      <Icon name={BRANCH_ICONS[i % BRANCH_ICONS.length]} size={20} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{branch.name}</span>
                        {active && <Icon name="checkCircle" size={18} className="text-brand-500" />}
                      </span>
                      <span className="block text-xs text-muted mt-1">{branch.tagline}</span>
                      <span className="block text-[11px] text-muted mt-1.5">{branch.topic_count} topics</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up space-y-8">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">What is your current level?</h2>
                  <p className="text-muted text-sm mt-1.5">We match topic difficulty to your answer.</p>
                </div>
                <Button variant="ghost" size="sm" as={Link} to="/placement">
                  <Icon name="target" size={15} /> Not sure? Take the check
                </Button>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mt-5">
                {LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => update({ level: level.value })}
                    className={cx('rounded-2xl border p-4 text-left transition', form.level === level.value ? 'border-brand-500 bg-brand-500/5' : 'border-line hover:border-brand-400/60')}
                  >
                    <span className="block font-semibold">{level.label}</span>
                    <span className="block text-xs text-muted mt-1">{level.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">How long should the path be?</h2>
              <div className="grid sm:grid-cols-3 gap-4 mt-5">
                {LENGTHS.map((len) => (
                  <button
                    key={len.value}
                    type="button"
                    onClick={() => update({ length: len.value })}
                    className={cx('rounded-2xl border p-4 text-left transition', form.length === len.value ? 'border-brand-500 bg-brand-500/5' : 'border-line hover:border-brand-400/60')}
                  >
                    <span className="block font-semibold">{len.label}</span>
                    <span className="block text-xs text-muted mt-1">{len.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up space-y-8">
            <div>
              <h2 className="text-xl font-semibold">What do you want to achieve?</h2>
              <p className="text-muted text-sm mt-1.5">Optional, but a clear goal sharpens the recommendations.</p>
              <Textarea
                className="mt-4"
                placeholder="e.g. understand eigenvectors and PCA to prepare for machine learning"
                value={form.goal}
                maxLength={300}
                onChange={(e) => update({ goal: e.target.value })}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Any specific interests?</h2>
              <p className="text-muted text-sm mt-1.5">Choose tags that excite you - we&apos;ll prioritise matching topics.</p>
              <div className="mt-4">
                <TagPicker options={tagData?.tags || []} value={form.interestTags} onChange={(tags) => update({ interestTags: tags })} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            {previewing && <Loading label="Assembling your roadmap" />}
            {!previewing && previewError && <ErrorState error={previewError} onRetry={runPreview} />}
            {!previewing && !previewError && preview && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{preview.title}</h2>
                    <p className="text-muted text-sm mt-1.5">
                      {preview.meta.selectedCount} topics · {formatMinutes(preview.meta.totalMinutes)} ·{' '}
                      {preview.meta.resourceCount} curated resources
                    </p>
                  </div>
                  {preview.items.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={runPreview}>
                      <Icon name="sparkles" size={15} /> Regenerate
                    </Button>
                  )}
                </div>

                {preview.items.length === 0 ? (
                  <p className="text-muted mt-6">{preview.meta.message}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {Object.entries(preview.meta.branchBreakdown).map(([name, count]) => (
                        <span key={name} className="badge bg-sunken text-muted">{name}: {count}</span>
                      ))}
                      <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300">
                        Avg level {preview.meta.averageDifficulty}
                      </span>
                    </div>

                    <ol className="mt-6 space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                      {preview.items.map((item) => (
                        <li key={item.topic.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                          <span className="w-7 h-7 rounded-lg bg-sunken flex items-center justify-center text-xs font-bold shrink-0">
                            {item.order}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{item.topic.title}</span>
                            <span className="block text-xs text-muted">
                              {item.topic.branch_name} · {item.resources.length} resources
                            </span>
                          </span>
                          <DifficultyPill level={item.topic.difficulty_level} showLabel={false} />
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* nav */}
        <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-line">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <Icon name="arrowLeft" size={16} /> Back
          </Button>

          {step < 3 ? (
            <Button disabled={!canContinue} onClick={() => (step === 2 ? runPreview() : setStep((s) => s + 1))}>
              {step === 2 ? (previewing ? 'Generating…' : 'Generate roadmap') : 'Continue'}
              <Icon name="arrowRight" size={16} />
            </Button>
          ) : (
            <Button disabled={saving || !preview?.items?.length} onClick={save}>
              {saving ? 'Saving…' : isAuthenticated ? 'Save to my dashboard' : 'Sign in to save'}
              <Icon name="check" size={16} />
            </Button>
          )}
        </div>
      </Card>

      {step === 0 && form.branchSlugs.length === 0 && form.trackIds.length === 0 && (
        <p className="text-sm text-muted mt-4 text-center">Select a goal or a subject to continue.</p>
      )}
    </div>
  );
}
