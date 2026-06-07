import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictEnvironmentRaw = {
  id: string;
  state_id: string;
  district_id: string;
  district_commissioner_user_id: string;
  official_name: string | null;
  official_email: string | null;
  official_phone: string | null;
  office_address: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DistrictEnvironmentRow = DistrictEnvironmentRaw & {
  state_name?: string | null;
  district_name?: string | null;
  commissioner_name?: string | null;
  commissioner_email?: string | null;
  total_members?: number;
  total_groups?: number;
};

type StateRow = {
  id: string;
  state_name?: string | null;
  name?: string | null;
  state?: string | null;
};

type DistrictMasterRow = {
  id: string;
  state_id: string;
  district_name: string | null;
  district_code: string | null;
  status: string | null;
};

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  status: string | null;
};

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeStatus(value?: string | null) {
  return String(value || "active").trim().toLowerCase();
}

function isActiveStatus(value?: string | null) {
  const status = normalizeStatus(value);
  return status === "active" || status === "aktif";
}

function isInactiveStatus(value?: string | null) {
  const status = normalizeStatus(value);

  return (
    status === "suspended" ||
    status === "inactive" ||
    status === "digantung" ||
    status === "tidak aktif"
  );
}

function getStateDisplayName(state: StateRow) {
  return state.state_name || state.name || state.state || "-";
}

function getStatusBadge(statusValue?: string | null) {
  if (isActiveStatus(statusValue)) {
    return (
      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
        Aktif
      </span>
    );
  }

  if (isInactiveStatus(statusValue)) {
    return (
      <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
        Digantung / Tidak Aktif
      </span>
    );
  }

  return (
    <span className="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2">
      {statusValue || "-"}
    </span>
  );
}

export default function DistrictManagementPage() {
  const [districts, setDistricts] = useState<DistrictEnvironmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("Semua Negeri");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  useEffect(() => {
    fetchDistricts();
  }, []);

  async function countMembers(environmentId: string) {
    try {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("district_environment_id", environmentId)
        .is("deleted_at", null);

      if (error) return 0;

      return count || 0;
    } catch {
      return 0;
    }
  }

  async function countGroups(environmentId: string) {
    try {
      const { count, error } = await supabase
        .from("groups")
        .select("id", { count: "exact", head: true })
        .eq("district_environment_id", environmentId)
        .is("deleted_at", null);

      if (error) return 0;

      return count || 0;
    } catch {
      return 0;
    }
  }

  async function fetchDistricts() {
    setLoading(true);

    try {
      const [
        environmentsResult,
        statesResult,
        districtsResult,
        commissionersResult,
      ] = await Promise.all([
        supabase
          .from("district_environments")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),

        supabase.from("states").select("*"),

        supabase
          .from("districts")
          .select("id, state_id, district_name, district_code, status"),

        supabase
          .from("system_users")
          .select(
            "id, full_name, email, role, district, district_environment_id, status"
          )
          .eq("role", "Pesuruhjaya Daerah"),
      ]);

      if (environmentsResult.error) throw environmentsResult.error;
      if (statesResult.error) throw statesResult.error;
      if (districtsResult.error) throw districtsResult.error;
      if (commissionersResult.error) throw commissionersResult.error;

      const stateMap = new Map<string, string>();
      const districtMap = new Map<string, DistrictMasterRow>();
      const commissionerMap = new Map<string, SystemUser>();

      (statesResult.data || []).forEach((state: StateRow) => {
        stateMap.set(state.id, getStateDisplayName(state));
      });

      (districtsResult.data || []).forEach((district: DistrictMasterRow) => {
        districtMap.set(district.id, district);
      });

      (commissionersResult.data || []).forEach((user: SystemUser) => {
        commissionerMap.set(user.id, user);
      });

      const enriched = await Promise.all(
        (environmentsResult.data || []).map(
          async (environment: DistrictEnvironmentRaw) => {
            const districtMaster = districtMap.get(environment.district_id);

            const commissioner = commissionerMap.get(
              environment.district_commissioner_user_id
            );

            const [memberCount, groupCount] = await Promise.all([
              countMembers(environment.id),
              countGroups(environment.id),
            ]);

            return {
              ...environment,
              state_name: stateMap.get(environment.state_id) || "-",
              district_name: districtMaster?.district_name || "-",
              commissioner_name: commissioner?.full_name || "-",
              commissioner_email: commissioner?.email || "-",
              total_members: memberCount,
              total_groups: groupCount,
            };
          }
        )
      );

      setDistricts(enriched);
    } catch (error: any) {
      console.error("Failed to fetch district environments:", error);
      alert(error?.message || "Gagal mendapatkan senarai daerah.");
    } finally {
      setLoading(false);
    }
  }

  const states = useMemo(() => {
    const unique = Array.from(
      new Set(districts.map((district) => district.state_name).filter(Boolean))
    ) as string[];

    return ["Semua Negeri", ...unique.sort()];
  }, [districts]);

  const filteredDistricts = useMemo(() => {
    return districts.filter((district) => {
      const keyword = search.toLowerCase().trim();

      const matchSearch =
        !keyword ||
        normalizeText(district.state_name).toLowerCase().includes(keyword) ||
        normalizeText(district.district_name).toLowerCase().includes(keyword) ||
        normalizeText(district.official_name).toLowerCase().includes(keyword) ||
        normalizeText(district.official_email).toLowerCase().includes(keyword) ||
        normalizeText(district.commissioner_name)
          .toLowerCase()
          .includes(keyword) ||
        normalizeText(district.commissioner_email)
          .toLowerCase()
          .includes(keyword);

      const matchState =
        stateFilter === "Semua Negeri" || district.state_name === stateFilter;

      const matchStatus =
        statusFilter === "Semua Status" ||
        (statusFilter === "Aktif" && isActiveStatus(district.status)) ||
        (statusFilter === "Digantung" && isInactiveStatus(district.status));

      return matchSearch && matchState && matchStatus;
    });
  }, [districts, search, stateFilter, statusFilter]);

  const activeCount = districts.filter((district) =>
    isActiveStatus(district.status)
  ).length;

  const inactiveCount = districts.filter((district) =>
    isInactiveStatus(district.status)
  ).length;

  const totalMembers = districts.reduce(
    (sum, district) => sum + (district.total_members || 0),
    0
  );

  const totalGroups = districts.reduce(
    (sum, district) => sum + (district.total_groups || 0),
    0
  );

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Daerah</h2>
          <p className="text-muted mb-0">
            Pantau dan urus tetapan district environment yang telah diluluskan
            dalam sistem.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchDistricts}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Environment Berdaftar"
          value={districts.length}
          icon="bi-building"
          color="dark"
        />

        <SummaryCard
          title="Environment Aktif"
          value={activeCount}
          icon="bi-check-circle"
          color="success"
        />

        <SummaryCard
          title="Digantung / Tidak Aktif"
          value={inactiveCount}
          icon="bi-pause-circle"
          color="danger"
        />

        <SummaryCard
          title="Jumlah Ahli"
          value={totalMembers}
          icon="bi-people"
          color="primary"
        />

        <SummaryCard
          title="Jumlah Kumpulan"
          value={totalGroups}
          icon="bi-diagram-3"
          color="info"
        />
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-6">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>

                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari negeri, daerah, email atau pesuruhjaya..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
              >
                {states.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Digantung</option>
              </select>
            </div>
          </div>
        </div>

        <div className="d-none d-lg-block table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Negeri</th>
                <th className="px-4 py-3">Daerah</th>
                <th className="px-4 py-3">Pesuruhjaya</th>
                <th className="px-4 py-3">Ahli</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tetapan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan senarai daerah...
                    </p>
                  </td>
                </tr>
              ) : filteredDistricts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada district environment dijumpai.
                  </td>
                </tr>
              ) : (
                filteredDistricts.map((district) => (
                  <tr key={district.id}>
                    <td className="px-4 py-3">{district.state_name || "-"}</td>

                    <td className="px-4 py-3">
                      <div className="fw-semibold">
                        {district.district_name || "-"}
                      </div>
                      <small className="text-muted">
                        {district.official_name || "-"}
                      </small>
                    </td>

                    <td className="px-4 py-3">
                      <div className="fw-semibold">
                        {district.commissioner_name || "-"}
                      </div>
                      <small className="text-muted">
                        {district.commissioner_email || "-"}
                      </small>
                    </td>

                    <td className="px-4 py-3 fw-semibold">
                      {district.total_members || 0}
                    </td>

                    <td className="px-4 py-3 fw-semibold">
                      {district.total_groups || 0}
                    </td>

                    <td className="px-4 py-3">
                      {getStatusBadge(district.status)}
                    </td>

                    <td className="px-4 py-3 text-end">
                      <Link
                        to={`/superadmin/districts/${district.id}`}
                        className="btn btn-sm btn-success rounded-pill px-3"
                      >
                        <i className="bi bi-sliders me-1"></i>
                        Urus Tetapan
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="d-lg-none p-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">
                Memuatkan senarai daerah...
              </p>
            </div>
          ) : filteredDistricts.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Tiada district environment dijumpai.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredDistricts.map((district) => (
                <div className="border rounded-4 p-3 bg-white" key={district.id}>
                  <div className="d-flex justify-content-between gap-2 mb-2">
                    <div>
                      <h6 className="fw-bold mb-1">
                        {district.district_name || "-"}
                      </h6>
                      <div className="small text-muted">
                        {district.state_name || "-"}
                      </div>
                    </div>

                    <div>{getStatusBadge(district.status)}</div>
                  </div>

                  <div className="small mb-2">
                    <div>
                      <span className="text-muted">Pesuruhjaya:</span>{" "}
                      <strong>{district.commissioner_name || "-"}</strong>
                    </div>

                    <div className="text-muted">
                      {district.commissioner_email || "-"}
                    </div>
                  </div>

                  <div className="d-flex gap-3 small text-muted mb-3">
                    <span>Ahli: {district.total_members || 0}</span>
                    <span>Kumpulan: {district.total_groups || 0}</span>
                  </div>

                  <Link
                    to={`/superadmin/districts/${district.id}`}
                    className="btn btn-success w-100 rounded-pill"
                  >
                    <i className="bi bi-sliders me-1"></i>
                    Urus Tetapan
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredDistricts.length} daripada {districts.length}{" "}
          rekod
        </div>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="col-md-6 col-xl">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="text-muted small mb-1">{title}</p>
              <h3 className={`fw-bold text-${color} mb-0`}>{value}</h3>
            </div>

            <div className={`rounded-3 bg-${color}-subtle text-${color} p-3`}>
              <i className={`bi ${icon} fs-4`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}