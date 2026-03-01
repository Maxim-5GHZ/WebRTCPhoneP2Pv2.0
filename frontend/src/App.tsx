import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuthContext } from './hooks/useAuth';
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import AdminRoute from './routes/AdminRoute.tsx';

function App() {
  const { user, MfaRequired, loading } = useAuthContext();

  // Пока идет проверка токена, можно показывать заглушку
  if (loading) {
    return <div>Loading application...</div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/verify-2fa" element={MfaRequired ? <TwoFactorAuthPage /> : <Navigate to="/login" />} />
        
        {/* Protected Routes */}
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />

        {/* Admin Route */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        
        {/* Fallback for any other path */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;