import React, { useEffect, useState } from "react";
import { api, getDeploymentConfig, reloadCloudWorkspace, clearCloudCache } from "./api.js";
import { clearDeviceSessions, downloadJson } from "./browser.js";

function CloudAccount({ user, onError }) {
  const [available, setAvailable] = useState(false),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(() =>
      window.location.hash === "#cloud-sign-in-failed"
        ? "The sign-in link expired or opened in a different browser. Request a new link here and open it in this browser."
        : "",
    ),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    getDeploymentConfig()
      .then((c) => setAvailable(!!c.cloudAvailable))
      .catch(onError);
  }, []);
  useEffect(() => {
    if (window.location.hash === "#cloud-signed-out-local")
      setMessage(
        "Signed out on this device. The cloud service could not confirm session revocation. Keep exported backups safe and retry sign-in/sign-out when connectivity returns.",
      );
  }, []);
  if (!available) return null;
  const switchWorkspace = async () => {
    await clearCloudCache();
    try {
      clearDeviceSessions();
    } catch {}
    window.location.reload();
  };
  async function start(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const d = await api("/api/cloud/auth/start", { email: email.trim() });
      setMessage(
        d.message ||
          "If this email is approved for cloud access, a sign-in link has been sent.",
      );
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel import-panel cloud-account">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR PRIVATE SYNCED WORKSPACE</span>
          <h2>
            {user?.role === "cloud"
              ? "Cloud saving is connected."
              : "Continue on your other device."}
          </h2>
        </div>
        <span className="badge">
          {user?.role === "cloud" ? "Signed in" : "Optional cloud account"}
        </span>
      </div>
      {user?.role === "cloud" ? (
        <>
          <p className="muted">
            Your notes, decks and progress save to your private cloud workspace.
            Sign in with the same approved email on your laptop or desktop.
            Guest notes stay separate until you explicitly copy them.
          </p>
          <div className="controls">
            <button
              onClick={async () => {
                if (
                  !window.confirm(
                    "Reload the latest cloud workspace? Copy any unsaved edits first; reloading will discard them.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  await reloadCloudWorkspace();
                  await switchWorkspace();
                } catch (error) {
                  onError(error);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Reload cloud workspace
            </button>
            <button
              onClick={async () => {
                if (
                  !window.confirm(
                    "Copy all guest notes, decks, files and progress from this browser into your signed-in cloud workspace? This explicitly uploads that material. Existing guest and cloud data will be kept.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  const backup = await (
                    await import("./guest.js")
                  ).guestApi("/api/backup");
                  await api("/api/restore", backup);
                  await switchWorkspace();
                } catch (error) {
                  onError(error);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Copy browser guest material into cloud
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api("/api/cloud/auth/logout", {});
                  if (!result.revocationConfirmed)
                    window.location.hash = "cloud-signed-out-local";
                  await switchWorkspace();
                } catch (error) {
                  onError(error);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Sign out · return to guest
            </button>
          </div>
          <p className="small muted">
            Signing out keeps both workspaces. Cloud saves require a connection;
            failed saves are shown and never silently moved into guest storage.
          </p>
        </>
      ) : (
        <>
          <p className="muted">
            Use an approved email to receive a one-time sign-in link. Signing in
            opens a separate private cloud workspace. Nothing from this
            browser’s guest library is uploaded automatically.
          </p>
          <form className="cloud-auth-form" onSubmit={start}>
            <label htmlFor="cloud-email">
              Approved email
              <input
                id="cloud-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                maxLength={254}
              />
            </label>
            <button disabled={busy} className="primary">
              {busy ? "Please wait…" : "Email a sign-in link"}
            </button>
          </form>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <p className="small muted">
            No password or sign-in token is saved in browser storage. Your email
            is used for private sign-in with Supabase. Open the link in the same
            browser that requested it on each device. You can keep using the
            guest workspace without signing in.
          </p>
        </>
      )}
    </section>
  );
}
export default function Settings({ user, onError, onRestore }) {
  const [users, setUsers] = useState([]),
    [audit, setAudit] = useState([]),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("viewer"),
    [active, setActive] = useState(true),
    [restore, setRestore] = useState(null);
  useEffect(() => {
    if (user?.role === "admin") {
      api("/api/admin/users")
        .then((d) => setUsers(d.users || d))
        .catch(onError);
      api("/api/admin/audit")
        .then((d) => setAudit(d.events || d))
        .catch(onError);
    }
  }, [user?.role]);
  const exportData = (path, name) => async (event) => {
    if (!["guest", "cloud"].includes(user?.role)) return;
    event.preventDefault();
    try {
      downloadJson(await api(path), name);
    } catch (error) {
      onError(error);
    }
  };
  return (
    <>
      <span className="eyebrow">YOUR WORKSPACE, YOUR CONTROL</span>
      <h1>Settings & backup.</h1>
      <CloudAccount user={user} onError={onError} />
      <section className="panel import-panel">
        <h2>Keep a copy of your learning.</h2>
        <p className="muted">
          Download your study data or restore an existing StudyCade backup.
        </p>
        <div className="controls">
          <a
            className="button"
            href="/api/export"
            download
            onClick={exportData("/api/export", "studycade-export.json")}
          >
            Export study data ↓
          </a>
          <a
            className="button primary"
            href="/api/backup"
            download
            onClick={exportData("/api/backup", "studycade-backup.json")}
          >
            Download full backup ↓
          </a>
          <label className="button">
            Choose backup to restore
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                try {
                  const f = e.target.files[0];
                  if (f) {
                    if (f.size > 20_000_000)
                      throw Error("Backup exceeds 20 MB.");
                    setRestore(JSON.parse(await f.text()));
                  }
                } catch (e) {
                  onError(e);
                }
              }}
            />
          </label>
        </div>
        {restore && (
          <div className="warning">
            <p>
              Restore this backup into this workspace? Guest and cloud restores
              add private material without replacing existing decks. Download
              your current backup first.
            </p>
            <button onClick={() => setRestore(null)}>Cancel</button>{" "}
            <button
              className="primary"
              onClick={async () => {
                try {
                  await api("/api/restore", restore);
                  setRestore(null);
                  await onRestore();
                } catch (e) {
                  onError(e);
                }
              }}
            >
              Confirm restore
            </button>
          </div>
        )}
      </section>
      <section className="panel import-panel">
        <h2>Data on this device</h2>
        <p className="muted">
          {user?.role === "guest"
            ? "Guest work is stored in this browser profile. Export a backup before using a different browser or clearing its storage. Anyone using this same browser profile can open it."
            : user?.role === "cloud"
              ? "Cloud material stays in memory while this page is open and is saved to your private account. Clearing this device cache never deletes the cloud workspace. Sign out when you finish on a shared device."
              : "Saved game sessions stay in this tab until it is closed. Clear them when you finish on a shared device."}
        </p>
        <button
          onClick={async () => {
            if (
              user?.role === "guest" &&
              !window.confirm(
                "Clear all StudyCade guest notes, decks and progress from this browser? Download a backup first. This cannot be undone.",
              )
            )
              return;
            try {
              if (user?.role === "guest")
                await (await import("./guest.js")).clearGuestData();
              if (user?.role === "cloud") await clearCloudCache();
              clearDeviceSessions();
              window.location.reload();
            } catch (error) {
              onError(error);
            }
          }}
        >
          {user?.role === "guest"
            ? "Clear guest data from this device"
            : user?.role === "cloud"
              ? "Clear this device cache · keep cloud data"
              : "Clear saved game sessions"}
        </button>
      </section>
      {user?.role === "admin" && (
        <>
          <section className="panel import-panel">
            <h2>Workspace access</h2>
            <form
              className="controls"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("/api/admin/users", { email, role, active });
                  const d = await api("/api/admin/users");
                  setUsers(d.users || d);
                  setEmail("");
                } catch (e) {
                  onError(e);
                }
              }}
            >
              <label>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {["viewer", "editor", "admin"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Active account
              </label>
              <button className="primary">Save user</button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setEmail(u.email);
                            setRole(u.role);
                            setActive(!!u.active);
                          }}
                        >
                          {u.email}
                        </button>
                      </td>
                      <td>{u.role}</td>
                      <td>{u.active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel import-panel">
            <h2>Recent account activity</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.slice(0, 50).map((e, i) => (
                    <tr key={i}>
                      <td>{e.createdAt || e.timestamp || e.at}</td>
                      <td>{e.action || e.event}</td>
                      <td>{e.email || e.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
