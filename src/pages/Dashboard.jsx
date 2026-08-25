import { Link } from 'react-router-dom'

function Dashboard() {
  return (
    <div className="app">
      <header className="navbar">
        <h2>TajVid</h2>

        <Link to="/">
          <button className="login-btn">Fita</button>
        </Link>
      </header>

      <main className="hero">
        <div className="hero-content">
          <h1>Barka da zuwa Dashboard 🎉</h1>

          <h2>TajVid ɗinka yana shirye!</h2>

          <p>
            Daga nan za ka iya ganin ayyuka, koyon sabbin skills
            da kuma sarrafa kuɗinka.
          </p>
        </div>
      </main>

      <section className="features">
        <div className="card">
          <h3>💼 Ayyuka</h3>
          <p>Gano sabbin ayyukan da za ka iya yi.</p>
        </div>

        <div className="card">
          <h3>📚 Koyo</h3>
          <p>Koyi skills da za su taimaka maka samun ci gaba.</p>
        </div>

        <div className="card">
          <h3>💰 Wallet</h3>
          <p>Duba balance da tarihin kuɗinka.</p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
