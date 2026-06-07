import { useEffect, useState } from "react";

type RoleType =
  | "superadmin"
  | "district"
  | "assistantCommissioner"
  | "groupLeader"
  | "assistantLeader";

type TopbarProps = {
  role?: RoleType;
  hideSearch?: boolean;
  onToggleSidebar?: () => void;
};

type ProfileState = {
  name: string;
  roleName: string;
  initials: string;
  profileImageUrl: string;
};

const fallbackProfile: Record<RoleType, ProfileState> = {
  superadmin: {
    name: "Super Admin",
    roleName: "Super Admin",
    initials: "SA",
    profileImageUrl: "",
  },
  district: {
    name: "Pesuruhjaya Daerah",
    roleName: "Pesuruhjaya Daerah",
    initials: "PD",
    profileImageUrl: "",
  },
  assistantCommissioner: {
    name: "Penolong Pesuruhjaya",
    roleName: "Penolong Pesuruhjaya Daerah",
    initials: "PP",
    profileImageUrl: "",
  },
  groupLeader: {
    name: "Pemimpin Kumpulan",
    roleName: "Pemimpin Kumpulan",
    initials: "PK",
    profileImageUrl: "",
  },
  assistantLeader: {
    name: "Penolong Pemimpin",
    roleName: "Penolong Pemimpin",
    initials: "PT",
    profileImageUrl: "",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        "{}"
    );
  } catch {
    return {};
  }
}

function normalizeRole(role?: string | null) {
  if (role === "District") return "Pesuruhjaya Daerah";
  if (role === "Penolong Pesuruhjaya") {
    return "Penolong Pesuruhjaya Daerah";
  }

  return role || "";
}

function buildProfile(role: RoleType): ProfileState {
  const savedUser = getCurrentUser();
  const fallback = fallbackProfile[role];

  const displayName =
    savedUser.full_name ||
    savedUser.name ||
    fallback.name;

  const displayRole =
    normalizeRole(savedUser.role) ||
    fallback.roleName;

  return {
    name: displayName,
    roleName: displayRole,
    initials: getInitials(displayName || fallback.name),
    profileImageUrl: savedUser.profile_image_url || "",
  };
}

export default function Topbar({
  role = "district",
  hideSearch = false,
}: TopbarProps) {
  const [profile, setProfile] = useState<ProfileState>(() =>
    buildProfile(role)
  );

  useEffect(() => {
    function refreshProfile() {
      setProfile(buildProfile(role));
    }

    refreshProfile();

    window.addEventListener("userProfileUpdated", refreshProfile);
    window.addEventListener("storage", refreshProfile);

    return () => {
      window.removeEventListener("userProfileUpdated", refreshProfile);
      window.removeEventListener("storage", refreshProfile);
    };
  }, [role]);

  return (
    <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center sticky-top">
      <div>
        {!hideSearch && (
          <input
            className="form-control"
            placeholder="Cari ahli, kumpulan, sekolah atau pengguna..."
            style={{ width: "320px" }}
          />
        )}
      </div>

      <div className="d-flex align-items-center gap-3">
        <i className="bi bi-bell fs-5"></i>

        <div className="d-flex align-items-center gap-2 border-start ps-3">
          {profile.profileImageUrl ? (
            <img
              src={profile.profileImageUrl}
              alt="Profile"
              className="rounded-circle border"
              style={{
                width: 38,
                height: 38,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: 38, height: 38 }}
            >
              {profile.initials}
            </div>
          )}

          <div>
            <div className="fw-semibold small">{profile.name}</div>
            <small className="text-muted">{profile.roleName}</small>
          </div>
        </div>
      </div>
    </header>
  );
}