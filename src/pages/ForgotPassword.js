import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordReset } from "../auth";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await sendPasswordReset(email);
      setMessage(
        "If an account with that email exists, a reset link has been sent."
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}

        <button type="submit">Send reset link</button>
      </form>

      <p style={{ marginTop: "15px" }}>
        Back to <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
