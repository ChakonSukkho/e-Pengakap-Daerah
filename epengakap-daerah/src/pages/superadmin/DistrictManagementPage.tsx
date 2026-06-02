import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictRow = {
  id: string;
  state: string | null;
  district: string | null;
  official_name: string | null;
  email: string | null;
  phone: string | null;
  commissioner: string | null;
  address: string | null;
  status: string | null;
  total_members?: number;
  total_groups?: number;
};

export default function DistrictManagementPage() {
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("Semua Negeri");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRow | null>(
    null
  );
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchDistricts();
  }, []);

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }

  async function addAuditLog(
    action: string,
    module: string,
    description: string
  ) {
    const user = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: user.full_name || "Super Admin",
      actor_role: user.role || "Super Admin",
      action,
      module,
      description,
    });
  }

  async function fetchDistricts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("district_settings")
      .select("*")
      .order("state", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (district) => {
        const districtName = district.district || "";

        const { count: memberCount } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("group_name", districtName);

        const { count: groupCount } = await supabase
          .from("groups")
          .select("*", { count: "exact", head: true })
          .eq("school_name", districtName);

        return {
          ...district,
          total_members: memberCount || 0,
          total_groups: groupCount || 0,
        };
      })
    );

    setDistricts(enriched);
    setLoading(false);
  }

  const states = useMemo(() => {
    const unique = Array.from(
      new Set(districts.map((d) => d.state).filter(Boolean))
    );

    return ["Semua Negeri", ...unique] as string[];
  }, [districts]);

  const filteredDistricts = useMemo(() => {
    return districts.filter((district) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (district.state || "").toLowerCase().includes(keyword) ||
        (district.district || "").toLowerCase().includes(keyword) ||
        (district.official_name || "").toLowerCase().includes(keyword) ||
        (district.email || "").toLowerCase().includes(keyword) ||
        (district.commissioner || "").toLowerCase().includes(keyword);

      const matchState =
        stateFilter === "Semua Negeri" || district.state === stateFilter;

      const normalizedStatus = (district.status || "Active").toLowerCase();

      const matchStatus =
        statusFilter === "Semua Status" ||
        normalizedStatus === statusFilter.toLowerCase();

      return matchSearch && matchState && matchStatus;
    });
  }, [districts, search, stateFilter, statusFilter]);

  function getStatusBadge(statusValue: string | null) {
    const normalized = (statusValue || "Active").toLowerCase();

    if (normalized === "active" || normalized === "aktif") {
      return (
        <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
          Aktif
        </span>
      );
    }

    if (
      normalized === "suspended" ||
      normalized === "tidak aktif" ||
      normalized === "digantung"
    ) {
      return (
        <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
          Digantung
        </span>
      );
    }

    return (
      <span className="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2">
        {statusValue || "-"}
      </span>
    );
  }

  function openViewModal(district: DistrictRow) {
    setSelectedDistrict(district);
    setShowViewModal(true);
  }

  async function updateDistrictStatus(district: DistrictRow) {
    const currentStatus = (district.status || "Active").toLowerCase();
    const nextStatus =
      currentStatus === "active" || currentStatus === "aktif"
        ? "Suspended"
        : "Active";

    const confirmMessage =
      nextStatus === "Suspended"
        ? `Gantung daerah ${district.district}?`
        : `Aktifkan daerah ${district.district}?`;

    if (!confirm(confirmMessage)) return;

    setUpdatingId(district.id);

    const { error } = await supabase
      .from("district_settings")
      .update({ status: nextStatus })
      .eq("id", district.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    await addAuditLog(
      nextStatus === "Suspended" ? "SUSPEND" : "ACTIVATE",
      "Senarai Daerah",
      `${nextStatus === "Suspended" ? "Gantung" : "Aktifkan"} daerah ${
        district.district || "-"
      }`
    );

    await fetchDistricts();
    setUpdatingId(null);
  }

  async function deleteDistrict(district: DistrictRow) {
    if (!confirm(`Padam daerah ${district.district}?`)) return;

    setUpdatingId(district.id);

    const { error } = await supabase
      .from("district_settings")
      .delete()
      .eq("id", district.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    await addAuditLog(
      "DELETE",
      "Senarai Daerah",
      `Padam daerah ${district.district || "-"}`
    );

    await fetchDistricts();
    setUpdatingId(null);
  }

  const activeCount = districts.filter((d) => {
    const status = (d.status || "Active").toLowerCase();
    return status === "active" || status === "aktif";
  }).length;

  const suspendedCount = districts.filter((d) => {
    const status = (d.status || "").toLowerCase();
    return (
      status === "suspended" ||
      status === "tidak aktif" ||
      status === "digantung"
    );
  }).length;

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Senarai Daerah</h2>
          <p className="text-muted mb-0">
            Pantau semua daerah yang telah didaftarkan.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchDistricts}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Daerah</p>
              <h3 className="fw-bold mb-0">{districts.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Daerah Aktif</p>
              <h3 className="fw-bold text-success mb-0">{activeCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Daerah Digantung</p>
              <h3 className="fw-bold text-danger mb-0">{suspendedCount}</h3>
            </div>
          </div>
        </div>
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
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
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
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option value="Active">Aktif</option>
                <option value="Suspended">Digantung</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Negeri</th>
                <th className="px-4 py-3">Daerah</th>
                <th className="px-4 py-3">Pesuruhjaya</th>
                <th className="px-4 py-3">Jumlah Ahli</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
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
                    Tiada daerah dijumpai.
                  </td>
                </tr>
              ) : (
                filteredDistricts.map((district) => (
                  <tr key={district.id}>
                    <td className="px-4 py-3">{district.state || "-"}</td>

                    <td className="px-4 py-3">
                      <div className="fw-semibold">
                        {district.district || "-"}
                      </div>
                      <small className="text-muted">
                        {district.official_name || "-"}
                      </small>
                    </td>

                    <td className="px-4 py-3">
                      {district.commissioner || "-"}
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
                      <button
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        onClick={() => openViewModal(district)}
                        title="View"
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        onClick={() => updateDistrictStatus(district)}
                        disabled={updatingId === district.id}
                        title="Tukar Status"
                      >
                        <i className="bi bi-power"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-light border text-danger rounded-3"
                        onClick={() => deleteDistrict(district)}
                        disabled={updatingId === district.id}
                        title="Padam"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredDistricts.length} daripada {districts.length}{" "}
          rekod
        </div>
      </div>

      {showViewModal && selectedDistrict && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Daerah</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Negeri</span>
                    <strong>{selectedDistrict.state || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Daerah</span>
                    <strong>{selectedDistrict.district || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Nama Rasmi</span>
                    <strong>{selectedDistrict.official_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Pesuruhjaya</span>
                    <strong>{selectedDistrict.commissioner || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Email</span>
                    <strong>{selectedDistrict.email || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Telefon</span>
                    <strong>{selectedDistrict.phone || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jumlah Ahli</span>
                    <strong>{selectedDistrict.total_members || 0}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedDistrict.total_groups || 0}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    {getStatusBadge(selectedDistrict.status)}
                  </div>

                  <div className="list-group-item">
                    <div className="text-muted mb-1">Alamat</div>
                    <div>{selectedDistrict.address || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}