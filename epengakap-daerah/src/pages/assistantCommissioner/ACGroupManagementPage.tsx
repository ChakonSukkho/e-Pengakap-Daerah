import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Group = {
  id: string;
  group_name: string;
  school_name: string;
  leader_name: string;
  total_members: number;
  status: string;
  created_at?: string;
};

export default function ACGroupManagementPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    setLoading(true);

    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("group_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setGroups(data || []);
    setLoading(false);
  }

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (group.group_name || "").toLowerCase().includes(keyword) ||
        (group.school_name || "").toLowerCase().includes(keyword) ||
        (group.leader_name || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || group.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [groups, search, statusFilter]);

  const activeGroups = groups.filter((g) => g.status === "Aktif").length;
  const needLeaderGroups = groups.filter(
    (g) => !g.leader_name || g.leader_name === "—"
  ).length;

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Kumpulan / Sekolah</h2>
          <p className="text-muted mb-0">
            Senarai kumpulan dan sekolah dalam daerah untuk pemantauan.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchGroups}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Jumlah Kumpulan</div>
              <h3 className="fw-bold mb-0">{groups.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Kumpulan Aktif</div>
              <h3 className="fw-bold text-success mb-0">{activeGroups}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Perlu Pemimpin</div>
              <h3 className="fw-bold text-warning mb-0">{needLeaderGroups}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari kumpulan, sekolah atau pemimpin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-4">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
                <option>Perlu Pemimpin</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Sekolah</th>
                <th className="px-4 py-3">Pemimpin</th>
                <th className="px-4 py-3">Jumlah Ahli</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan kumpulan...
                    </p>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada kumpulan dijumpai.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold">{group.group_name}</div>
                      <small className="text-muted">
                        Kod: {group.id.slice(0, 8)}
                      </small>
                    </td>

                    <td className="px-4 py-3">{group.school_name || "-"}</td>

                    <td className="px-4 py-3">
                      {group.leader_name && group.leader_name !== "—" ? (
                        group.leader_name
                      ) : (
                        <span className="text-warning">Belum ditetapkan</span>
                      )}
                    </td>

                    <td className="px-4 py-3 fw-semibold">
                      {group.total_members || 0}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${
                          group.status === "Aktif"
                            ? "bg-success-subtle text-success border border-success-subtle"
                            : group.status === "Perlu Pemimpin"
                            ? "bg-warning-subtle text-warning border border-warning-subtle"
                            : "bg-secondary-subtle text-secondary border border-secondary-subtle"
                        }`}
                      >
                        {group.status || "Aktif"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <button
                        className="btn btn-sm btn-light border rounded-3"
                        onClick={() => setSelectedGroup(group)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredGroups.length} daripada {groups.length} rekod
        </div>
      </div>

      {selectedGroup && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Kumpulan</h5>

                <button
                  className="btn-close"
                  onClick={() => setSelectedGroup(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedGroup.group_name}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Sekolah</span>
                    <strong>{selectedGroup.school_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Pemimpin</span>
                    <strong>{selectedGroup.leader_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jumlah Ahli</span>
                    <strong>{selectedGroup.total_members || 0}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <strong>{selectedGroup.status || "Aktif"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Tarikh Daftar</span>
                    <strong>
                      {selectedGroup.created_at
                        ? new Date(selectedGroup.created_at).toLocaleDateString()
                        : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedGroup(null)}
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