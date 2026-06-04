import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

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
    name: "Ahmad Razali",
    roleName: "Super Admin",
    initials: "SA",
    profileImageUrl: "",
  },
  district: {
    name: "Encik Kamarul",
    roleName: "Pesuruhjaya Daerah",
    initials: "PD",
    profileImageUrl: "",
  },
  assistantCommissioner: {
    name: "Pn. Siti Aminah",
    roleName: "Penolong Pesuruhjaya",
    initials: "PP",
    profileImageUrl: "",
  },
  groupLeader: {
    name: "En. Farid Hassan",
    roleName: "Pemimpin Kumpulan",
    initials: "PK",
    profileImageUrl: "",
  },
  assistantLeader: {
    name: "Cik Nur Aisyah",
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
  return JSON.parse(
    localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "{}"
  );
}

export default function Topbar({
  role = "district",
  hideSearch = false,
}: TopbarProps) {
  const [profile, setProfile] = useState<ProfileState>(() => {
  const savedUser = getCurrentUser();
  const loginName = savedUser.full_name || savedUser.name || fallbackProfile[role].name;

  return {
    name: loginName,
    roleName: savedUser.role || fallbackProfile[role].roleName,
    initials: getInitials(loginName),
    profileImageUrl: savedUser.profile_image_url || "",
  };
});

  async function loadProfile() {
    const savedUser = getCurrentUser();

    const loginName =
      savedUser.full_name || savedUser.name || fallbackProfile[role].name;

    let nextProfile: ProfileState = {
      name: loginName,
      roleName: savedUser.role || fallbackProfile[role].roleName,
      initials: getInitials(loginName),
      profileImageUrl: savedUser.profile_image_url || "",
    };

    // For Pesuruhjaya Daerah, sync profile from district_settings DB
    if (role === "district") {
      let query = supabase
        .from("district_settings")
        .select("commissioner, profile_image_url, district")
        .limit(1);

      if (savedUser.district || savedUser.district_name || savedUser.daerah) {
        query = query.eq(
          "district",
          savedUser.district || savedUser.district_name || savedUser.daerah
        );
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const commissionerName = data.commissioner || loginName;

        nextProfile = {
          ...nextProfile,
          name: commissionerName,
          initials: getInitials(commissionerName),
          profileImageUrl: data.profile_image_url || nextProfile.profileImageUrl,
        };

        const updatedUser = {
          ...savedUser,
          name: commissionerName,
          full_name: commissionerName,
          profile_image_url: data.profile_image_url || "",
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }
    }

    setProfile(nextProfile);
  }

  useEffect(() => {
    loadProfile();

    window.addEventListener("userProfileUpdated", loadProfile);

    return () => {
      window.removeEventListener("userProfileUpdated", loadProfile);
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