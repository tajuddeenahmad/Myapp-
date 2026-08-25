import { Link } from 'react-router-dom'

function Jobs() {
  return (
    <div className="jobs-page">
      <header className="navbar">
        <h2>TajVid</h2>

        <Link to="/">
          <button className="login-btn">Gida</button>
        </Link>
      </header>

      <main className="jobs-content">
        <h1>Ayyuka 💼</h1>

        <p>
          Zaɓi aikin da ya dace da kai kuma fara samun kuɗi.
        </p>

        <div className="jobs-list">

          <div className="job-card">
            <h2>✍️ Rubuta Articles</h2>
            <p>Rubuta gajerun articles ko posts.</p>
            <h3>₦1,000</h3>
            <button className="start-btn">Fara Aiki</button>
          </div>

          <div className="job-card">
            <h2>📱 Digital Marketing</h2>
            <p>Taimaka wajen tallata products da services.</p>
            <h3>₦2,500</h3>
            <button className="start-btn">Fara Aiki</button>
          </div>

          <div className="job-card">
            <h2>⌨️ Data Entry</h2>
            <p>Shigar da bayanai cikin tsari.</p>
            <h3>₦1,500</h3>
            <button className="start-btn">Fara Aiki</button>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Jobs
