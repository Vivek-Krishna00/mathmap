import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Button, Card, Field, Input } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, role) => setForm({ email, password: 'mathmap123' });

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <span className="inline-flex w-12 h-12 rounded-2xl bg-brand-600 text-white items-center justify-center mb-4">
          <Icon name="sigma" size={26} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted mt-2">Sign in to build roadmaps and contribute.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </Field>
          <Field label="Password">
            <Input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-sm text-muted text-center mt-5">
          New to MathMap? <Link className="link" to="/register">Create an account</Link>
        </p>
      </Card>

      {/*
        Demo shortcuts are dev-only. Gated on an explicit .env.development flag rather than
        import.meta.env.DEV, because a NODE_ENV=production in the shell flips DEV to false
        even when you are running the dev server.
      */}
      {import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true' && (
        <Card className="p-4 mt-5 bg-sunken/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Demo accounts · password mathmap123</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" onClick={() => fillDemo('admin@mathmap.dev', 'admin')}>
              <Icon name="shield" size={12} /> admin@mathmap.dev
            </button>
            <button type="button" className="chip" onClick={() => fillDemo('moderator@mathmap.dev', 'moderator')}>
              <Icon name="flag" size={12} /> moderator@mathmap.dev
            </button>
            <button type="button" className="chip" onClick={() => fillDemo('priya@mathmap.dev', 'learner')}>
              <Icon name="user" size={12} /> priya@mathmap.dev
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
