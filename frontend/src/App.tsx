import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuthContext } from './hooks/useAuth';
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage.tsx";

function App() {
  const { user, MfaRequired } = useAuthContext();

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/verify-2fa" element={MfaRequired ? <TwoFactorAuthPage /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;