import { useEffect, useState } from "react";

type RoleType =
  | "superadmin"
  | "district"
  | "assistantCommissioner"
  | "groupLeader"
  | "assistantLeader";

type TopbarProps = {
  role?: RoleType;
  onToggleSidebar?: () => void;
};

type ProfileState = {
  name: string;
  roleName: string;
  initials: string;
  profileImageUrl: string;
  profileImageOffsetX: number;
  profileImageOffsetY: number;
  profileImageZoom: number;
};

const fallbackProfile: Record<RoleType, ProfileState> = {
  superadmin: {
    name: "Super Admin",
    roleName: "Super Admin",
    initials: "SA",
    profileImageUrl: "",
    profileImageOffsetX: 0,
    profileImageOffsetY: 0,
    profileImageZoom: 1,
  },
  district: {
    name: "Pesuruhjaya Daerah",
    roleName: "Pesuruhjaya Daerah",
    initials: "PD",
    profileImageUrl: "",
    profileImageOffsetX: 0,
    profileImageOffsetY: 0,
    profileImageZoom: 1,
  },
  assistantCommissioner: {
    name: "Penolong Pesuruhjaya",
    roleName: "Penolong Pesuruhjaya Daerah",
    initials: "PP",
    profileImageUrl: "",
    profileImageOffsetX: 0,
    profileImageOffsetY: 0,
    profileImageZoom: 1,
  },
  groupLeader: {
    name: "Pemimpin Kumpulan",
    roleName: "Pemimpin Kumpulan",
    initials: "PK",
    profileImageUrl: "",
    profileImageOffsetX: 0,
    profileImageOffsetY: 0,
    profileImageZoom: 1,
  },
  assistantLeader: {
    name: "Penolong Pemimpin",
    roleName: "Penolong Pemimpin",
    initials: "PT",
    profileImageUrl: "",
    profileImageOffsetX: 0,
    profileImageOffsetY: 0,
    profileImageZoom: 1,
  },
};

function getInitials(name: string) {
  return String(name || "")
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

  if (role === "Assistant Commissioner") {
    return "Penolong Pesuruhjaya Daerah";
  }

  if (role === "Group Leader") {
    return "Pemimpin Kumpulan";
  }

  if (role === "Assistant Leader") {
    return "Penolong Pemimpin";
  }

  return role || "";
}

function clampOffset(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < -260) return -260;
  if (value > 260) return 260;
  return Math.round(value);
}

function clampZoom(value: number) {
  if (Number.isNaN(value)) return 1;
  if (value < 1) return 1;
  if (value > 3) return 3;
  return Number(value.toFixed(2));
}

function buildProfile(role: RoleType): ProfileState {
  const savedUser = getCurrentUser();
  const fallback = fallbackProfile[role];

  const displayName = savedUser.full_name || savedUser.name || fallback.name;
  const displayRole = normalizeRole(savedUser.role) || fallback.roleName;

  return {
    name: displayName,
    roleName: displayRole,
    initials: getInitials(displayName || fallback.name) || fallback.initials,
    profileImageUrl: savedUser.profile_image_url || "",
    profileImageOffsetX: clampOffset(Number(savedUser.profile_image_offset_x ?? 0)),
    profileImageOffsetY: clampOffset(Number(savedUser.profile_image_offset_y ?? 0)),
    profileImageZoom: clampZoom(Number(savedUser.profile_image_zoom ?? 1)),
  };
}

function ProfileAvatar({
  profile,
  size = 42,
}: {
  profile: ProfileState;
  size?: number;
}) {
  if (!profile.profileImageUrl) {
    return (
      <div
        className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
        style={{
          width: size,
          height: size,
          fontSize: size <= 42 ? 14 : 18,
          flexShrink: 0,
        }}
      >
        {profile.initials}
      </div>
    );
  }

  const scaleRatio = size / 320;

  return (
    <div
      className="rounded-circle border overflow-hidden bg-light"
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <img
        src={profile.profileImageUrl}
        alt="Profile"
        draggable={false}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size,
          height: size,
          objectFit: "cover",
          transform: `translate(calc(-50% + ${
            profile.profileImageOffsetX * scaleRatio
          }px), calc(-50% + ${
            profile.profileImageOffsetY * scaleRatio
          }px)) scale(${profile.profileImageZoom})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}

export default function Topbar({ role = "district" }: TopbarProps) {
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

  function handleNotificationClick() {
    alert("Fungsi notifikasi akan dibangunkan selepas modul utama siap.");
  }

  return (
    <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-end align-items-center sticky-top">
      <div className="d-flex align-items-center gap-3">
        <button
          type="button"
          className="btn btn-light rounded-circle position-relative"
          title="Notifikasi"
          onClick={handleNotificationClick}
        >
          <i className="bi bi-bell fs-5"></i>

          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: 10 }}
          >
            0
          </span>
        </button>

        <div className="d-flex align-items-center gap-2 border-start ps-3">
          <ProfileAvatar profile={profile} size={42} />

          <div className="d-none d-md-block">
            <div className="fw-semibold small">{profile.name}</div>
            <small className="text-muted">{profile.roleName}</small>
          </div>
        </div>
      </div>
    </header>
  );
}