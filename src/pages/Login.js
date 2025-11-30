import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const cred = await loginUser(email, password);
      const user = cred.user;

      if (!user.emailVerified) {
        setError(
          "Your email is not verified yet. Please check your inbox and click the verification link."
        );
        return;
      }

      //logged in and verified then go to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2>Login</h2>
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

        <div style={{ marginBottom: "10px" }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit">Login</button>
      </form>

      <p style={{ marginTop: "15px" }}>
        Don&apos;t have an account?{" "}
        <Link to="/register">Register</Link>
      </p>

      <p style={{ marginTop: "5px" }}>
        Forgot your password?{" "}
        <Link to="/forgot-password">Reset it here</Link>
      </p>
    </div>
  );
};

export default Login;
