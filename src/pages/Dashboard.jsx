import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalViews: 0,
    appRevenue: 0,
    userEarnings: 0,
    totalWithdrawals: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // USERS
      let usersData = [];

      try {
        const usersSnap = await getDocs(
          collection(db, "users")
        );

        usersData = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.log("Users collection error:", error);
      }

      // VIDEOS
      let videosData = [];

      try {
        const videosSnap = await getDocs(
          collection(db, "videos")
        );

        videosData = videosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.log("Videos collection error:", error);
      }

      // WITHDRAWALS
      let withdrawalsData = [];

      try {
        const withdrawalsSnap = await getDocs(
          collection(db, "withdrawals")
        );

        withdrawalsData = withdrawalsSnap.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );
      } catch (error) {
        console.log(
          "Withdrawals collection error:",
          error
        );
      }

      // TOTAL VIEWS
      const totalViews = videosData.reduce(
        (total, video) => {
          return (
            total +
            Number(
              video.views ||
                video.viewCount ||
                video.totalViews ||
                0
            )
          );
        },
        0
      );

      // USER EARNINGS
      const userEarnings = usersData.reduce(
        (total, user) => {
          return (
            total +
            Number(
              user.earnings ||
                user.totalEarnings ||
                user.balance ||
                0
            )
          );
        },
        0
      );

      // TOTAL WITHDRAWALS
      const totalWithdrawals =
        withdrawalsData.reduce(
          (total, withdrawal) => {
            return (
              total +
              Number(
                withdrawal.amount ||
                  withdrawal.total ||
                  0
              )
            );
          },
          0
        );

      // APP REVENUE
      const REVENUE_PER_1000_VIEWS = 2;

      const appRevenue =
        (totalViews / 1000) *
        REVENUE_PER_1000_VIEWS;

      setUsers(usersData);
      setVideos(videosData);
      setWithdrawals(withdrawalsData);

      setStats({
        totalUsers: usersData.length,
        totalVideos: videosData.length,
        totalViews,
        appRevenue,
        userEarnings,
        totalWithdrawals,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat("en-NG").format(
      Number(number || 0)
    );
  };

  const getUserName = (user) => {
    return (
      user.username ||
      user.displayName ||
      user.name ||
      user.email ||
      "Unknown User"
    );
  };

  const getVideoViews = (video) => {
    return Number(
      video.views ||
        video.viewCount ||
        video.totalViews ||
        0
    );
  };

  const getWithdrawalStatus = (withdrawal) => {
    const status = String(
      withdrawal.status || "pending"
    ).toLowerCase();

    if (status === "approved") {
      return "Approved";
    }

    if (status === "paid") {
      return "Paid";
    }

    if (status === "rejected") {
      return "Rejected";
    }

    return "Pending";
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loader}></div>

        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <div style={styles.smallTitle}>
            TAJVID ADMIN
          </div>

          <h1 style={styles.title}>
            Admin Dashboard
          </h1>

          <p style={styles.subtitle}>
            Manage your app and monitor your
            business.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          style={styles.refreshButton}
        >
          🔄 Refresh
        </button>
      </div>

      {/* STATS */}
      <div style={styles.statsGrid}>
        <div style={styles.card}>
          <div style={styles.iconBox}>👥</div>

          <div>
            <p style={styles.cardLabel}>
              Total Users
            </p>

            <h2 style={styles.cardValue}>
              {formatNumber(
                stats.totalUsers
              )}
            </h2>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.iconBox}>🎬</div>

          <div>
            <p style={styles.cardLabel}>
              Total Videos
            </p>

            <h2 style={styles.cardValue}>
              {formatNumber(
                stats.totalVideos
              )}
            </h2>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.iconBox}>👁️</div>

          <div>
            <p style={styles.cardLabel}>
              Total Views
            </p>

            <h2 style={styles.cardValue}>
              {formatNumber(
                stats.totalViews
              )}
            </h2>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.iconBox}>💰</div>

          <div>
            <p style={styles.cardLabel}>
              App Revenue
            </p>

            <h2 style={styles.moneyValue}>
              {formatMoney(
                stats.appRevenue
              )}
            </h2>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.iconBox}>💵</div>

          <div>
            <p style={styles.cardLabel}>
              User Earnings
            </p>

            <h2 style={styles.moneyValue}>
              {formatMoney(
                stats.userEarnings
              )}
            </h2>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.iconBox}>💳</div>

          <div>
            <p style={styles.cardLabel}>
              Withdrawals
            </p>

            <h2 style={styles.moneyValue}>
              {formatMoney(
                stats.totalWithdrawals
              )}
            </h2>
          </div>
        </div>
      </div>

      {/* BUSINESS SUMMARY */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          💼 Business Summary
        </h2>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span>App Revenue</span>

            <strong>
              {formatMoney(
                stats.appRevenue
              )}
            </strong>
          </div>

          <div style={styles.summaryCard}>
            <span>User Earnings</span>

            <strong>
              {formatMoney(
                stats.userEarnings
              )}
            </strong>
          </div>

          <div style={styles.summaryCard}>
            <span>Withdrawals</span>

            <strong>
              {formatMoney(
                stats.totalWithdrawals
              )}
            </strong>
          </div>

          <div style={styles.summaryCard}>
            <span>Estimated Balance</span>

            <strong>
              {formatMoney(
                stats.appRevenue -
                  stats.userEarnings
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* USERS */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            👥 Users
          </h2>

          <span style={styles.countBadge}>
            {users.length}
          </span>
        </div>

        {users.length === 0 ? (
          <div style={styles.empty}>
            No users found.
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    User
                  </th>

                  <th style={styles.th}>
                    Email
                  </th>

                  <th style={styles.th}>
                    Earnings
                  </th>
                </tr>
              </thead>

              <tbody>
                {users
                  .slice(0, 20)
                  .map((user) => (
                    <tr key={user.id}>
                      <td style={styles.td}>
                        <div
                          style={
                            styles.userCell
                          }
                        >
                          <div
                            style={
                              styles.avatar
                            }
                          >
                            {getUserName(
                              user
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span>
                            {getUserName(
                              user
                            )}
                          </span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        {user.email || "—"}
                      </td>

                      <td style={styles.td}>
                        {formatMoney(
                          user.earnings ||
                            user.totalEarnings ||
                            user.balance ||
                            0
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TOP VIDEOS */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          🔥 Top Videos
        </h2>

        {videos.length === 0 ? (
          <div style={styles.empty}>
            No videos found.
          </div>
        ) : (
          <div style={styles.videoList}>
            {[...videos]
              .sort(
                (a, b) =>
                  getVideoViews(b) -
                  getVideoViews(a)
              )
              .slice(0, 10)
              .map((video, index) => (
                <div
                  key={video.id}
                  style={styles.videoRow}
                >
                  <div style={styles.rank}>
                    #{index + 1}
                  </div>

                  <div
                    style={styles.videoInfo}
                  >
                    <strong>
                      {video.title ||
                        video.caption ||
                        "Untitled Video"}
                    </strong>

                    <span>
                      {formatNumber(
                        getVideoViews(
                          video
                        )
                      )}{" "}
                      views
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* WITHDRAWALS */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            💳 Recent Withdrawals
          </h2>

          <span style={styles.countBadge}>
            {withdrawals.length}
          </span>
        </div>

        {withdrawals.length === 0 ? (
          <div style={styles.empty}>
            No withdrawal requests.
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    User
                  </th>

                  <th style={styles.th}>
                    Amount
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {withdrawals
                  .slice(0, 20)
                  .map((withdrawal) => {
                    const status =
                      getWithdrawalStatus(
                        withdrawal
                      );

                    return (
                      <tr
                        key={
                          withdrawal.id
                        }
                      >
                        <td
                          style={
                            styles.td
                          }
                        >
                          {withdrawal.username ||
                            withdrawal.email ||
                            withdrawal.userId ||
                            "Unknown"}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {formatMoney(
                            withdrawal.amount ||
                              0
                          )}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          <span
                            style={{
                              ...styles.status,

                              ...(status ===
                              "Rejected"
                                ? styles.rejected
                                : status ===
                                  "Paid"
                                ? styles.paid
                                : status ===
                                  "Approved"
                                ? styles.approved
                                : styles.pending),
                            }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <p>
          TajVid Admin Dashboard
        </p>

        <p>
          Your app statistics are loaded
          from Firebase.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    height: "100vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: "#f5f7fb",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#111827",
    WebkitOverflowScrolling: "touch",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
    color: "#111827",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loader: {
    width: "42px",
    height: "42px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #111827",
    borderRadius: "50%",
    animation:
      "spin 1s linear infinite",
    marginBottom: "14px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "28px",
  },

  smallTitle: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2px",
    color: "#6b7280",
    marginBottom: "6px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  refreshButton: {
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    flexShrink: 0,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.06)",
  },

  iconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  cardLabel: {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
  },

  cardValue: {
    margin: "5px 0 0",
    fontSize: "25px",
    fontWeight: "800",
  },

  moneyValue: {
    margin: "5px 0 0",
    fontSize: "21px",
    fontWeight: "800",
  },

  section: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.05)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
  },

  countBadge: {
    background: "#111827",
    color: "#ffffff",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "700",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },

  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "600px",
  },

  th: {
    textAlign: "left",
    padding: "13px 10px",
    borderBottom:
      "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: "12px",
    textTransform: "uppercase",
  },

  td: {
    padding: "14px 10px",
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: "14px",
  },

  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: "700",
  },

  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    flexShrink: 0,
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#6b7280",
    background: "#f9fafb",
    borderRadius: "12px",
  },

  videoList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "15px",
  },

  videoRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
  },

  rank: {
    fontWeight: "800",
    minWidth: "45px",
  },

  videoInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  status: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
  },

  pending: {
    background: "#fef3c7",
    color: "#92400e",
  },

  approved: {
    background: "#dbeafe",
    color: "#1e40af",
  },

  paid: {
    background: "#dcfce7",
    color: "#166534",
  },

  rejected: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  footer: {
    textAlign: "center",
    padding: "20px",
    color: "#6b7280",
    fontSize: "13px",
  },
};
