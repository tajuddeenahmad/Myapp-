import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";

const LANGUAGES = [
  "English",
  "Hausa",
  "Arabic",
  "French",
  "Spanish",
  "Portuguese",
  "German",
  "Italian",
  "Dutch",
  "Turkish",
  "Persian",
  "Urdu",
  "Swahili",
  "Yoruba",
  "Igbo",
  "Amharic",
  "Somali",
  "Indonesian",
  "Malay",
  "Hindi",
  "Bengali",
  "Punjabi",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Thai",
  "Filipino",
  "Russian",
  "Ukrainian",
  "Polish",
  "Romanian",
  "Greek",
  "Hebrew",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Czech",
  "Slovak",
  "Hungarian",
  "Bulgarian",
  "Serbian",
  "Croatian",
  "Malayalam",
  "Kannada",
  "Nepali",
  "Sinhala",
  "Zulu",
  "Afrikaans",
];

export default function Settings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState(null);

  const [language, setLanguage] = useState(
    localStorage.getItem("tajvid_language") || "English"
  );

  const [theme, setTheme] = useState(
    localStorage.getItem("tajvid_theme") || "Dark"
  );

  const [notifications, setNotifications] = useState(
    localStorage.getItem("tajvid_notifications") !== "false"
  );

  const [publicProfile, setPublicProfile] = useState(
    localStorage.getItem("tajvid_public_profile") !== "false"
  );

  const ADMIN_EMAIL = (
    import.meta.env.VITE_ADMIN_EMAIL || ""
  )
    .trim()
    .toLowerCase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin =
    !!user?.email &&
    !!ADMIN_EMAIL &&
    user.email.trim().toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (selectedTheme) => {
    let dark = selectedTheme === "Dark";

    if (selectedTheme === "System") {
      dark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    document.documentElement.style.background = dark
      ? "#0f172a"
      : "#f5f7fb";

    document.body.style.background = dark
      ? "#0f172a"
      : "#f5f7fb";

    document.body.classList.toggle("light-mode", !dark);
  };

  const toggleSection = (section) => {
    setOpenSection((current) =>
      current === section ? null : section
    );
  };

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem("tajvid_language", newLanguage);

    alert(
      `Selected ${newLanguage}.\n\nYour language preference has been saved on this device.`
    );
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("tajvid_theme", newTheme);
    applyTheme(newTheme);
  };

  const toggleNotifications = () => {
    const value = !notifications;
    setNotifications(value);
    localStorage.setItem(
      "tajvid_notifications",
      String(value)
    );
  };

  const togglePublicProfile = () => {
    const value = !publicProfile;
    setPublicProfile(value);
    localStorage.setItem(
      "tajvid_public_profile",
      String(value)
    );
  };

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out of TajVid?"
    );

    if (!confirmed) return;

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      alert("There was a problem logging out.");
    }
  };

  const handleDeleteAccount = () => {
    alert(
      "Delete Account will require additional confirmation before your account can be permanently deleted."
    );
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Opening Settings...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={styles.backButton}
        >
          ←
        </button>

        <h1 style={styles.title}>Settings</h1>

        <div style={{ width: 40 }} />
      </div>

      <main style={styles.content}>

        {/* ACCOUNT */}
        <SectionTitle title="ACCOUNT" />

        <SettingItem
          icon="👤"
          title="Profile"
          description="Edit your username, bio and profile"
          onClick={() => navigate("/profile")}
        />

        <SettingItem
          icon="💰"
          title="Wallet"
          description="View your balance and transaction history"
          onClick={() => navigate("/wallet")}
        />

        <SettingItem
          icon="📊"
          title="Earnings"
          description="View your earnings and views"
          onClick={() => navigate("/earnings")}
        />

        <SettingItem
          icon="💸"
          title="Withdraw"
          description="Withdraw money to your bank account"
          onClick={() => navigate("/withdraw")}
        />

        {/* ADMIN */}
        {isAdmin && (
          <>
            <SectionTitle title="ADMIN" />

            <div style={styles.adminCard}>
              <div style={styles.adminIcon}>👑</div>

              <div style={styles.adminContent}>
                <h3 style={styles.adminTitle}>
                  Admin Dashboard
                </h3>

                <p style={styles.adminDescription}>
                  Manage users, videos, earnings,
                  withdrawals and TajVid revenue.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  style={styles.adminButton}
                >
                  Open Admin Dashboard →
                </button>
              </div>
            </div>
          </>
        )}

        {/* APP SETTINGS */}
        <SectionTitle title="APP SETTINGS" />

        <ExpandableItem
          icon="🔔"
          title="Notifications"
          description="Manage TajVid notifications"
          rightText={notifications ? "On" : "Off"}
          open={openSection === "notifications"}
          onClick={() => toggleSection("notifications")}
        />

        {openSection === "notifications" && (
          <div style={styles.expandBox}>
            <h3 style={styles.expandTitle}>
              🔔 Notifications
            </h3>

            <p style={styles.expandText}>
              Choose whether TajVid should show you
              notifications.
            </p>

            <button
              type="button"
              onClick={toggleNotifications}
              style={{
                ...styles.toggleButton,
                background: notifications
                  ? "#111827"
                  : "#e5e7eb",
                color: notifications
                  ? "#ffffff"
                  : "#111827",
              }}
            >
              {notifications
                ? "🔔 Notifications ON"
                : "🔕 Notifications OFF"}
            </button>
          </div>
        )}

        <ExpandableItem
          icon="🌙"
          title="Theme"
          description="Choose the app appearance"
          rightText={theme}
          open={openSection === "theme"}
          onClick={() => toggleSection("theme")}
        />

        {openSection === "theme" && (
          <div style={styles.expandBox}>
            <h3 style={styles.expandTitle}>
              🎨 Choose Theme
            </h3>

            {["Light", "Dark", "System"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => changeTheme(item)}
                style={{
                  ...styles.languageButton,
                  ...(theme === item
                    ? styles.selectedButton
                    : {}),
                }}
              >
                {item === "Light" && "☀️ "}
                {item === "Dark" && "🌙 "}
                {item === "System" && "📱 "}
                {item}

                {theme === item && <span> ✓</span>}
              </button>
            ))}
          </div>
        )}

        <ExpandableItem
          icon="🌍"
          title="Language"
          description="TajVid language"
          rightText={language}
          open={openSection === "language"}
          onClick={() => toggleSection("language")}
        />

        {openSection === "language" && (
          <div style={styles.languagePanel}>
            <div style={styles.languageHeader}>
              <strong>🌍 Choose TajVid language</strong>
              <span>{LANGUAGES.length} languages</span>
            </div>

            <div style={styles.languageGrid}>
              {LANGUAGES.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => changeLanguage(item)}
                  style={{
                    ...styles.languageButton,
                    ...(language === item
                      ? styles.selectedButton
                      : {}),
                  }}
                >
                  {item}
                  {language === item && <span> ✓</span>}
                </button>
              ))}
            </div>

            <p style={styles.note}>
              Your language preference is saved on this device.
            </p>
          </div>
        )}

        {/* PRIVACY & SAFETY */}
        <SectionTitle title="PRIVACY & SAFETY" />

        <ExpandableItem
          icon="🔒"
          title="Privacy"
          description="Manage your privacy information"
          open={openSection === "privacy"}
          onClick={() => toggleSection("privacy")}
        />

        {openSection === "privacy" && (
          <InfoContent
            title="🔒 Privacy"
            text={`TajVid respects your account information.

Information that may be used includes:
• Email
• Username
• Phone number if you use Phone Login
• Profile information
• Videos and comments you post

Never share your password with anyone.

Content you post may be visible to other users
according to TajVid's platform rules.`}
          />
        )}

        <ExpandableItem
          icon="🛡️"
          title="Account Security"
          description="Protect your account"
          open={openSection === "security"}
          onClick={() => toggleSection("security")}
        />

        {openSection === "security" && (
          <InfoContent
            title="🛡️ Account Security"
            text={`To protect your account:

• Never share your password.
• Never share your OTP with anyone.
• Use a strong password.
• If you use Google Login,
  make sure your Google account is secure.
• If you notice anything suspicious,
  log out and sign in again.`}
          />
        )}

        <ExpandableItem
          icon="👁️"
          title="Content Visibility"
          description="Manage how your content appears"
          rightText={publicProfile ? "Public" : "Private"}
          open={openSection === "visibility"}
          onClick={() => toggleSection("visibility")}
        />

        {openSection === "visibility" && (
          <div style={styles.expandBox}>
            <h3 style={styles.expandTitle}>
              👁️ Content Visibility
            </h3>

            <p style={styles.expandText}>
              Choose how your profile and content
              appear to other users.
            </p>

            <button
              type="button"
              onClick={togglePublicProfile}
              style={{
                ...styles.toggleButton,
                background: publicProfile
                  ? "#111827"
                  : "#e5e7eb",
                color: publicProfile
                  ? "#ffffff"
                  : "#111827",
              }}
            >
              {publicProfile
                ? "🌎 Profile Public"
                : "🔒 Profile Private"}
            </button>

            <p style={styles.smallNote}>
              This setting is currently saved on this device.
            </p>
          </div>
        )}

        {/* INFORMATION */}
        <SectionTitle title="INFORMATION" />

        <ExpandableItem
          icon="📜"
          title="Terms of Use"
          description="TajVid usage rules"
          open={openSection === "terms"}
          onClick={() => toggleSection("terms")}
        />

        {openSection === "terms" && (
          <InfoContent
            title="📜 Terms of Use"
            text={`By using TajVid, you agree to:

• Follow TajVid rules.
• Do not post illegal content.
• Do not harm or harass other users.
• Do not use TajVid for fraud.
• Do not steal other people's content.
• Do not use another person's account.
• Do not send spam or malware.
• Keep your login information secure.

TajVid may take action against accounts
that violate the platform rules.`}
          />
        )}

        <ExpandableItem
          icon="🆘"
          title="Help & Support"
          description="Get help if you have a problem"
          open={openSection === "support"}
          onClick={() => toggleSection("support")}
        />

        {openSection === "support" && (
          <div style={styles.expandBox}>
            <h3 style={styles.expandTitle}>
              🆘 Help & Support
            </h3>

            <p style={styles.expandText}>
              If you are having problems using TajVid,
              you can request help.
            </p>

            <button
              type="button"
              style={styles.optionButton}
              onClick={() =>
                alert(
                  "Support can help you with account, login, videos, wallet and other TajVid features."
                )
              }
            >
              🆘 Contact TajVid Support
            </button>

            <button
              type="button"
              style={styles.optionButton}
              onClick={() =>
                alert(
                  "Make sure your internet connection is working, then try again."
                )
              }
            >
              🌐 Network / Connection Help
            </button>
          </div>
        )}

        <ExpandableItem
          icon="ℹ️"
          title="About TajVid"
          description="About TajVid"
          open={openSection === "about"}
          onClick={() => toggleSection("about")}
        />

        {openSection === "about" && (
          <div style={styles.expandBox}>
            <div style={styles.aboutLogo}>🎬</div>

            <h2 style={styles.aboutTitle}>TajVid</h2>

            <p style={styles.aboutText}>
              Video sharing platform
            </p>

            <div style={styles.aboutCard}>
              <div style={styles.aboutRow}>
                <strong>Version</strong>
                <span>1.0.0</span>
              </div>

              <div style={styles.aboutRow}>
                <strong>Platform</strong>
                <span>Android / Web</span>
              </div>

              <div style={styles.aboutRow}>
                <strong>Account</strong>
                <span style={styles.accountText}>
                  {user?.email || "User"}
                </span>
              </div>
            </div>

            <p style={styles.aboutDescription}>
              TajVid is a video sharing platform where
              users can watch and share videos and use
              other platform features.
            </p>

            <p style={styles.copyright}>
              © 2026 TajVid
            </p>
          </div>
        )}

        {/* LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          🚪 Logout
        </button>

        {/* DANGER ZONE */}
        <div style={styles.dangerSection}>
          <h3 style={styles.dangerTitle}>
            ⚠️ Danger Zone
          </h3>

          <p style={styles.dangerText}>
            Delete Account will remove your account
            from TajVid. This action may not be reversible.
          </p>

          <button
            type="button"
            style={styles.deleteButton}
            onClick={handleDeleteAccount}
          >
            🗑️ Delete Account
          </button>
        </div>

        <div style={styles.bottomSpace} />
      </main>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={styles.sectionTitle}>
      {title}
    </div>
  );
}

function SettingItem({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={styles.settingItem}
    >
      <div style={styles.itemIcon}>{icon}</div>

      <div style={styles.itemContent}>
        <div style={styles.itemTitle}>{title}</div>

        <div style={styles.itemDescription}>
          {description}
        </div>
      </div>

      <span style={styles.arrow}>›</span>
    </button>
  );
}

function ExpandableItem({
  icon,
  title,
  description,
  rightText,
  open,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.settingItem,
        ...(open ? styles.openItem : {}),
      }}
    >
      <div style={styles.itemIcon}>{icon}</div>

      <div style={styles.itemContent}>
        <div style={styles.itemTitle}>{title}</div>

        <div style={styles.itemDescription}>
          {description}
        </div>
      </div>

      {rightText && (
        <span style={styles.rightText}>
          {rightText}
        </span>
      )}

      <span style={styles.arrow}>
        {open ? "⌄" : "›"}
      </span>
    </button>
  );
}

function InfoContent({ title, text }) {
  return (
    <div style={styles.expandBox}>
      <h3 style={styles.expandTitle}>{title}</h3>

      <p style={styles.expandText}>{text}</p>
    </div>
  );
}

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "#f5f7fb",
    color: "#111827",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: "hidden",
  },

  content: {
    position: "absolute",
    top: "64px",
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    paddingBottom: "30px",
    boxSizing: "border-box",
  },

  loading: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    color: "#111827",
  },

  spinner: {
    width: "38px",
    height: "38px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #111827",
    borderRadius: "50%",
    marginBottom: "12px",
    animation: "spin 1s linear infinite",
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "64px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    borderBottom: "1px solid #e5e7eb",
    zIndex: 20,
    boxSizing: "border-box",
  },

  backButton: {
    width: "40px",
    height: "40px",
    border: "none",
    borderRadius: "50%",
    background: "#f3f4f6",
    fontSize: "24px",
    cursor: "pointer",
  },

  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
  },

  sectionTitle: {
    padding: "22px 16px 8px",
    fontSize: "12px",
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: "1px",
  },

  settingItem: {
    width: "100%",
    minHeight: "72px",
    border: "none",
    borderBottom: "1px solid #eef0f3",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    padding: "14px 16px",
    cursor: "pointer",
    color: "#111827",
    boxSizing: "border-box",
    flexShrink: 0,
  },

  openItem: {
    background: "#f8fafc",
  },

  itemIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },

  itemContent: {
    flex: 1,
    marginLeft: "12px",
    minWidth: 0,
  },

  itemTitle: {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  itemDescription: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: "1.4",
  },

  arrow: {
    fontSize: "27px",
    color: "#9ca3af",
    marginLeft: "8px",
    flexShrink: 0,
  },

  rightText: {
    color: "#6b7280",
    fontSize: "13px",
    marginLeft: "8px",
    flexShrink: 0,
  },

  adminCard: {
    margin: "8px 16px 0",
    padding: "18px",
    borderRadius: "18px",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    gap: "14px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
  },

  adminIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  adminContent: {
    flex: 1,
    minWidth: 0,
  },

  adminTitle: {
    margin: "0 0 6px",
    fontSize: "18px",
    fontWeight: "800",
  },

  adminDescription: {
    margin: "0 0 14px",
    fontSize: "12px",
    lineHeight: "1.5",
    opacity: 0.8,
  },

  adminButton: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: "800",
    cursor: "pointer",
  },

  expandBox: {
    background: "#ffffff",
    padding: "18px 16px",
    borderBottom: "1px solid #e5e7eb",
    boxSizing: "border-box",
  },

  expandTitle: {
    margin: "0 0 10px",
    fontSize: "15px",
    fontWeight: "800",
  },

  expandText: {
    margin: 0,
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: "1.8",
    whiteSpace: "pre-line",
  },

  toggleButton: {
    width: "100%",
    border: "none",
    borderRadius: "11px",
    padding: "13px",
    marginTop: "15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  smallNote: {
    margin: "12px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  optionButton: {
    width: "100%",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#111827",
    borderRadius: "10px",
    padding: "12px",
    marginTop: "10px",
    textAlign: "left",
    fontWeight: "700",
    cursor: "pointer",
  },

  languagePanel: {
    background: "#ffffff",
    padding: "18px 16px",
    borderBottom: "1px solid #e5e7eb",
    boxSizing: "border-box",
  },

  languageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    gap: "10px",
    color: "#111827",
  },

  languageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    maxHeight: "430px",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingRight: "3px",
  },

  languageButton: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "10px",
    padding: "11px 10px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  selectedButton: {
    background: "#111827",
    color: "#ffffff",
    borderColor: "#111827",
  },

  note: {
    margin: "14px 0 0",
    fontSize: "11px",
    color: "#9ca3af",
  },

  aboutLogo: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "34px",
    margin: "0 auto 12px",
  },

  aboutTitle: {
    textAlign: "center",
    margin: "0 0 5px",
    fontSize: "24px",
  },

  aboutText: {
    textAlign: "center",
    color: "#6b7280",
    margin: "0 0 18px",
  },

  aboutCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
  },

  aboutRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "8px 0",
    fontSize: "13px",
  },

  accountText: {
    maxWidth: "65%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#6b7280",
  },

  aboutDescription: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "1.7",
    margin: "18px 0",
  },

  copyright: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "11px",
    margin: 0,
  },

  logoutButton: {
    width: "calc(100% - 32px)",
    margin: "24px 16px 0",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "15px",
    cursor: "pointer",
  },

  dangerSection: {
    margin: "24px 16px",
    padding: "18px",
    borderRadius: "16px",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
  },

  dangerTitle: {
    margin: "0 0 8px",
    color: "#be123c",
    fontSize: "16px",
  },

  dangerText: {
    margin: "0 0 14px",
    color: "#881337",
    fontSize: "12px",
    lineHeight: "1.6",
  },

  deleteButton: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#be123c",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
  },

  bottomSpace: {
    height: "50px",
  },
};
