import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const ChangePassword = () => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const redirectToDashboard = (role?: string) => {
    if (role === "student") navigate("/student");
    else if (role === "host_supervisor") navigate("/supervisor");
    else if (role === "faculty_supervisor") navigate("/faculty");
    else if (role === "admin") navigate("/admin");
    else navigate("/login");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (user && token) {
        login(token, { ...user, must_change_password: false });
      }

      setSuccess("Password changed successfully. Redirecting...");
      setTimeout(() => redirectToDashboard(user?.role), 700);
    } catch (err: unknown) {
      const maybeApiError = err as { response?: { data?: { message?: string } } };
      setError(maybeApiError.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">LogSync</span>
        </div>

        <h1>Change Password</h1>
        <p className="login-subtitle">
          For security, you must change your temporary password before continuing.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>CURRENT PASSWORD</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>NEW PASSWORD</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="login-btn" disabled={saving}>
            {saving ? "Saving..." : "Update Password"}
          </button>
        </form>

        <button
          type="button"
          className="login-btn"
          style={{ marginTop: "10px", background: "transparent", border: "1px solid #555" }}
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;
