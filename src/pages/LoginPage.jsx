/* Galactus AI - Login Page */
export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Galactus AI</h1>
          <p>Sign in to your developer workspace</p>
        </div>
        <form className="login-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Sign In
          </button>
        </form>
        <div className="login-footer">
          <p>Don't have an account? <a href="#">Create one</a></p>
        </div>
      </div>
    </div>
  );
}