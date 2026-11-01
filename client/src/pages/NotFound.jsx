import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Button } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className="inline-flex w-16 h-16 rounded-2xl bg-sunken text-muted items-center justify-center mb-6">
        <Icon name="compass" size={32} />
      </span>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted mt-3">We couldn&apos;t find that page. It may have moved, or the link may be broken.</p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Button as={Link} to="/">Back home</Button>
        <Button variant="secondary" as={Link} to="/explore">Explore topics</Button>
      </div>
    </div>
  );
}
