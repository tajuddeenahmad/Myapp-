import { Link } from 'react-router-dom'

function Jobs() {
  return (
    <div className="jobs-page">

      <header className="navbar">
        <h2>TajVid</h2>

        <Link to="/">
          <button className="login-btn">
            Home
          </button>
        </Link>
      </header>

      <main className="jobs-content">

        <h1>
          Jobs 💼
        </h1>

        <p>
          Choose a job that suits you and start earning money.
        </p>

        <div className="jobs-list">

          <div className="job-card">
            <h2>
              ✍️ Article Writing
            </h2>

            <p>
              Write short articles or posts.
            </p>

            <h3>
              ₦1,000
            </h3>

            <button className="start-btn">
              Start Job
            </button>
          </div>

          <div className="job-card">
            <h2>
              📱 Digital Marketing
            </h2>

            <p>
              Help promote products and services.
            </p>

            <h3>
              ₦2,500
            </h3>

            <button className="start-btn">
              Start Job
            </button>
          </div>

          <div className="job-card">
            <h2>
              ⌨️ Data Entry
            </h2>

            <p>
              Enter information accurately and efficiently.
            </p>

            <h3>
              ₦1,500
            </h3>

            <button className="start-btn">
              Start Job
            </button>
          </div>

        </div>

        <div
          style={{
            height: '50px',
          }}
        />

      </main>

    </div>
  )
}

export default Jobs
