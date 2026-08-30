// ---------------------------------------------------------------------------
// OrganizerHackathonsPage.jsx — "My Hackathons" Central Management Area
// Displays authenticated organizer's hackathons with View, Edit, & Delete actions.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DeleteConfirmationModal from "../../components/organizer/DeleteConfirmationModal";
import { hackathonService } from "../../services/hackathonService";
import { getHackathonRegistrationStatus } from "../../utils/hackathonFormatters";
import BackButton from "../../components/common/BackButton";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status) {
  switch (status) {
    case "OPEN":
    case "Registration Open":
    case "Active":
    case "Ongoing":
      return {
        label: "OPEN",
        className: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20",
      };
    case "UPCOMING":
    case "Upcoming":
      return {
        label: "UPCOMING",
        className: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20",
      };
    case "CLOSED":
    case "Registration Closed":
    case "Completed":
      return {
        label: "CLOSED",
        className: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700",
      };
    default:
      return {
        label: status || "OPEN",
        className: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20",
      };
  }
}

function OrganizerHackathonsPage() {
  const currentLocation = useLocation();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetHackathon, setTargetHackathon] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch organizer hackathons on mount
  useEffect(() => {
    let isMounted = true;
    async function loadMyHackathons() {
      try {
        setLoading(true);
        const data = await hackathonService.getMyHackathons();
        if (isMounted) {
          setHackathons(data?.hackathons || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load your hackathons.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadMyHackathons();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStatus = (h) => getHackathonRegistrationStatus(h);

  // Filter hackathons
  const filteredHackathons = hackathons.filter((h) => {
    const status = getStatus(h);
    if (activeFilter === "open") return status === "OPEN";
    if (activeFilter === "upcoming") return status === "UPCOMING";
    if (activeFilter === "closed") return status === "CLOSED";
    return true;
  });

  const promptDelete = (hackathon) => {
    setTargetHackathon(hackathon);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetHackathon) return;
    try {
      setDeleting(true);
      await hackathonService.deleteHackathon(targetHackathon.id);
      setHackathons((prev) => prev.filter((h) => h.id !== targetHackathon.id));
      setDeleteModalOpen(false);
      setTargetHackathon(null);
    } catch (err) {
      alert(err.message || "Failed to delete hackathon.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            ORGANIZER PORTAL
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            My Hackathons
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            View, edit, and manage all hackathons you have created.
          </p>
        </div>

        <Link
          to="/organizer/create"
          className="
            inline-flex
            items-center
            gap-2
            rounded-xl
            bg-indigo-600
            px-4
            py-2.5
            text-xs
            font-semibold
            text-white
            shadow-sm
            transition-colors
            hover:bg-indigo-500
            dark:bg-indigo-500
            dark:hover:bg-indigo-400
          "
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Hackathon</span>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
        {[
          { key: "all", label: "All Hackathons", count: hackathons.length },
          {
            key: "open",
            label: "Registration Open",
            count: hackathons.filter((h) => getStatus(h) === "OPEN").length,
          },
          {
            key: "upcoming",
            label: "Upcoming",
            count: hackathons.filter((h) => getStatus(h) === "UPCOMING").length,
          },
          {
            key: "closed",
            label: "Completed",
            count: hackathons.filter((h) => getStatus(h) === "CLOSED").length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              px-3
              py-1.5
              text-xs
              font-semibold
              transition-all
              duration-150
              ${
                activeFilter === tab.key
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }
            `}
          >
            <span>{tab.label}</span>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-white/20">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/60" />
          ))}
        </div>
      ) : filteredHackathons.length > 0 ? (
        /* ── Hackathons Card List ── */
        <div className="grid grid-cols-1 gap-4">
          {filteredHackathons.map((h) => {
            const statusLabel = getStatus(h);
            const badge = getStatusBadge(statusLabel);

            return (
              <div
                key={h.id}
                className="
                  flex
                  flex-col
                  justify-between
                  gap-4
                  rounded-2xl
                  border
                  border-neutral-200/90
                  bg-white
                  p-6
                  shadow-xs
                  transition-all
                  hover:border-neutral-300
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:hover:border-neutral-700
                  md:flex-row
                  md:items-center
                "
              >
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                      <Link
                        to={`/organizer/hackathons/${h.id}`}
                        state={{ from: currentLocation }}
                        className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {h.title || h.name}
                      </Link>
                    </h3>

                    <span
                      className={`
                        rounded-md
                        px-2.5
                        py-0.5
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        ${badge.className}
                      `}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {h.shortDescription || h.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                    <span>
                      <strong className="font-semibold text-neutral-700 dark:text-neutral-300">Reg. Deadline:</strong>{" "}
                      {formatDate(h.registrationDeadline)}
                    </span>
                    <span>
                      <strong className="font-semibold text-neutral-700 dark:text-neutral-300">Start:</strong>{" "}
                      {formatDate(h.startDate || h.hackathonDate)}
                    </span>
                    <span>
                      <strong className="font-semibold text-neutral-700 dark:text-neutral-300">End:</strong>{" "}
                      {formatDate(h.endDate || h.eventEndDate)}
                    </span>
                  </div>
                </div>

                {/* ── Actions: View | Edit | Delete ── */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t border-neutral-100 md:border-t-0 dark:border-neutral-800">
                  <Link
                    to={`/organizer/hackathons/${h.id}`}
                    className="
                      inline-flex
                      items-center
                      gap-1
                      rounded-lg
                      border
                      border-indigo-600
                      bg-indigo-600
                      px-3.5
                      py-2
                      text-xs
                      font-semibold
                      text-white
                      shadow-xs
                      transition-colors
                      hover:bg-indigo-500
                      hover:border-indigo-500
                      dark:border-indigo-500
                      dark:bg-indigo-500
                      dark:text-white
                      dark:hover:bg-indigo-400
                      dark:hover:border-indigo-400
                    "
                  >
                    <span>View</span>
                  </Link>

                  <Link
                    to={`/organizer/hackathons/${h.id}/edit`}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      bg-neutral-950
                      px-3.5
                      py-2
                      text-xs
                      font-semibold
                      text-white
                      transition-colors
                      hover:bg-neutral-800
                      dark:bg-white
                      dark:text-neutral-950
                      dark:hover:bg-neutral-200
                    "
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Edit</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => promptDelete(h)}
                    className="
                      inline-flex
                      items-center
                      gap-1
                      rounded-lg
                      border
                      border-red-200
                      bg-red-50/50
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-red-600
                      transition-colors
                      hover:bg-red-100
                      dark:border-red-900/50
                      dark:bg-red-950/40
                      dark:text-red-400
                      dark:hover:bg-red-900/60
                    "
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Create your first hackathon
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              Publish your hackathon on getHack and help developers discover it.
            </p>
          </div>

          <Link
            to="/organizer/create"
            className="
              inline-flex
              items-center
              gap-2
              rounded-lg
              bg-indigo-600
              px-4
              py-2.5
              text-xs
              font-semibold
              text-white
              shadow-xs
              transition-colors
              hover:bg-indigo-500
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Hackathon</span>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        hackathonTitle={targetHackathon?.title || targetHackathon?.name || ""}
        isDeleting={deleting}
      />
    </main>
  );
}

export default OrganizerHackathonsPage;
