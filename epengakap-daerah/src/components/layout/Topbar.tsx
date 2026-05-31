import { useEffect, useState } from "react";

type RoleType =
  | "superadmin"
  | "district"
  | "assistantCommissioner"
  | "groupLeader"
  | "assistantLeader";

const fallbackProfile: Record<
  RoleType,
  { name: string; roleName: string; initials: string }
> = {
  superadmin: { name: "Ahmad Razali", roleName: "Super Admin", initials: "SA" },
  district: { name: "Encik Kamarul", roleName: "Pesuruhjaya Daerah", initials: "PD" },
  assistantCommissioner: { name: "Pn. Siti Aminah", roleName: "Penolong Pesuruhjaya", initials: "PP" },
  groupLeader: { name: "En. Farid Hassan", roleName: "Pemimpin Kumpulan", initials: "PK" },
  assistantLeader: { name: "Cik Nur Aisyah", roleName: "Penolong Pemimpin", initials: "PT" },
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

export default function Topbar({
  role = "district",
}: {
  role?: RoleType;
  onToggleSidebar?: () => void;
}) {
  const [profile, setProfile] = useState(fallbackProfile[role]);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "null");

    if (savedUser) {
      const name =
        savedUser.full_name || savedUser.name || fallbackProfile[role].name;

      setProfile({
        name,
        roleName: savedUser.role || fallbackProfile[role].roleName,
        initials: getInitials(name),
      });
    }
  }, [role]);

  return (
    <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center sticky-top">
      <div>
        <input
          className="form-control"
          placeholder="Cari ahli, kumpulan, sekolah atau pengguna..."
          style={{ width: "320px" }}
        />
      </div>

      <div className="d-flex align-items-center gap-3">
        <i className="bi bi-bell fs-5"></i>

        <div className="d-flex align-items-center gap-2 border-start ps-3">
          <div
            className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 36, height: 36 }}
          >
            {profile.initials}
          </div>

          <div>
            <div className="fw-semibold small">{profile.name}</div>
            <small className="text-muted">{profile.roleName}</small>
          </div>
        </div>
      </div>
    </header>
  );
}