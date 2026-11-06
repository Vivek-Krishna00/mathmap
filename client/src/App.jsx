import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Loading, Toaster } from './components/ui.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

// Route-level code splitting: each page is its own chunk.
const Home = lazy(() => import('./pages/Home.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const BranchDetail = lazy(() => import('./pages/BranchDetail.jsx'));
const TopicDetail = lazy(() => import('./pages/TopicDetail.jsx'));
const GraphPage = lazy(() => import('./pages/GraphPage.jsx'));
const RoadmapWizard = lazy(() => import('./pages/RoadmapWizard.jsx'));
const RoadmapView = lazy(() => import('./pages/RoadmapView.jsx'));
const SharedRoadmap = lazy(() => import('./pages/SharedRoadmap.jsx'));
const Community = lazy(() => import('./pages/Community.jsx'));
const Placement = lazy(() => import('./pages/Placement.jsx'));
const Review = lazy(() => import('./pages/Review.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Problems = lazy(() => import('./pages/Problems.jsx'));
const Contribute = lazy(() => import('./pages/Contribute.jsx'));
const Moderation = lazy(() => import('./pages/Moderation.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <Suspense fallback={<Loading label="Loading" />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="explore" element={<Explore />} />
                <Route path="branches/:slug" element={<BranchDetail />} />
                <Route path="topics/:slug" element={<TopicDetail />} />
                <Route path="graph" element={<GraphPage />} />
                <Route path="roadmaps/new" element={<RoadmapWizard />} />
                <Route path="roadmaps/:id" element={<RoadmapView />} />
                <Route path="placement" element={<Placement />} />
                <Route path="shared/:token" element={<SharedRoadmap />} />
                <Route path="community" element={<Community />} />
                <Route path="problems" element={<Problems />} />
                <Route path="review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
                <Route
                  path="dashboard"
                  element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                />
                <Route
                  path="contribute"
                  element={<ProtectedRoute><Contribute /></ProtectedRoute>}
                />
                <Route
                  path="moderation"
                  element={<ProtectedRoute roles={['moderator', 'admin']}><Moderation /></ProtectedRoute>}
                />
                <Route
                  path="admin"
                  element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>}
                />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
