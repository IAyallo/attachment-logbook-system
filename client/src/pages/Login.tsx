import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { identifier, password });
      const { token, user } = response.data;

      login(token, user);

      if (user.role === "student") {
        navigate("/student");
      } else if (user.role === "host_supervisor") {
        navigate("/supervisor");
      } else if (user.role === "faculty_supervisor") {
        navigate("/faculty");
      } else {
        setError("This role does not have a dashboard yet.");
      }
    } catch (err: any) { //eslint-disable-line @typescript-eslint/no-explicit-any
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">LogSync</span>
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
      </div>
    </div>
  );
};

export default Login;
