import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const initialSessionError = (() => {
    const sessionEndedMessage = localStorage.getItem('sessionEndedMessage');
    if (sessionEndedMessage) {
      localStorage.removeItem('sessionEndedMessage');
    }
    return sessionEndedMessage || "";
  })();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState(initialSessionError);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const getErrorMessage = (err: unknown, fallback: string) => {
    const maybeApiError = err as { response?: { data?: { message?: string } } };
    return maybeApiError.response?.data?.message || fallback;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { identifier, password });
      const { token, user } = response.data;

      login(token, user);

      if (user.must_change_password) {
        navigate('/change-password');
        return;
      }

      if (user.role === "student") {
        navigate("/student");
      } else if (user.role === "host_supervisor") {
        navigate("/supervisor");
      } else if (user.role === "faculty_supervisor") {
        navigate("/faculty");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        setError("This role does not have a dashboard yet.");
      }
      } catch (err: unknown) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setRequestingReset(true);

    try {
      const response = await api.post('/auth/forgot-password-request', {
        identifier: forgotIdentifier,
      });
      setForgotSuccess(response.data.message || 'Reset request sent to administrators.');
      setForgotIdentifier('');
    } catch (err: unknown) {
      setForgotError(getErrorMessage(err, 'Failed to send reset request.'));
    } finally {
      setRequestingReset(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">Attachment Hub</span>
        </div>

        <h1>Welcome back</h1>
        <p className="login-subtitle">
          Sign in to access your attachment portal.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>EMAIL OR STUDENT ID</label>
            <input
              type="text"
              placeholder="you@strathmore.edu or 123456"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>PASSWORD</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="forgot-password-wrapper">
          <button
            type="button"
            className="forgot-password-toggle"
            onClick={() => {
              setShowForgotPassword((prev) => !prev);
              setForgotError('');
              setForgotSuccess('');
            }}
          >
            {showForgotPassword ? 'Hide forgot password' : 'Forgot password?'}
          </button>

          {showForgotPassword && (
            <div className="forgot-password-panel">
              <p className="login-subtitle" style={{ marginBottom: '10px' }}>
                Enter your email or student ID to notify admins.
              </p>
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label>EMAIL OR STUDENT ID</label>
                  <input
                    type="text"
                    placeholder="you@strathmore.edu or 123456"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                  />
                </div>

                {forgotError && <div className="error-message">{forgotError}</div>}
                {forgotSuccess && <div className="success-message">{forgotSuccess}</div>}

                <button type="submit" className="login-btn" disabled={requestingReset}>
                  {requestingReset ? 'Sending request...' : 'Request Password Reset'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
