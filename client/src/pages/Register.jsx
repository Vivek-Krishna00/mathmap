import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Button, Card, Field, Input, Textarea } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', bio: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      success(`Welcome to MathMap, ${user.name.split(' ')[0]}!`);
      navigate('/roadmaps/new', { replace: true });
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <span className="inline-flex w-12 h-12 rounded-2xl bg-brand-600 text-white items-center justify-center mb-4">
          <Icon name="sigma" size={26} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted mt-2">Personalized roadmaps, progress tracking and community contributions.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Name">
            <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ada Lovelace" />
          </Field>
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </Field>
          <Field label="Password" hint="At least 8 characters, with a letter and a number">
            <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </Field>
          <Field label="Short bio" hint="Optional">
            <Textarea maxLength={400} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What are you hoping to learn?" />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-sm text-muted text-center mt-5">
          Already have an account? <Link className="link" to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
