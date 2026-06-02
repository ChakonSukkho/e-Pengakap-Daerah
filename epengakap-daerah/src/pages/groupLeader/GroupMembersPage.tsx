import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  email: string;
  group_name: string;
  category: string;
  age: number;
  gender: string;
  status: string;
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

export default function GroupMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const groupName = currentUser.group_name || currentUser.district || "";

    let query = supabase
      .from("members")
      .select("*")
      .order("full_name", { ascending: true });

    if (groupName) {
      query = query.eq("group_name", groupName);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(members.map((member) => member.category).filter(Boolean))
    );

    return ["Semua Kategori", ...unique];
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (member.full_name || "").toLowerCase().includes(keyword) ||
        (member.email || "").toLowerCase().includes(keyword) ||
        (member.category || "").toLowerCase().includes(keyword);

      const matchCategory =
        categoryFilter === "Semua Kategori" ||
        member.category === categoryFilter;

      const matchStatus =
        statusFilter === "Semua Status" || member.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [members, search, categoryFilter, statusFilter]);

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Kumpulan</h2>
          <p className="text-muted mb-0">
            Senarai ahli di bawah kumpulan pemimpin.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchMembers}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Ahli</p>
              <h3 className="fw-bold mb-0">{members.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Ahli Aktif</p>
              <h3 className="fw-bold text-success mb-0">
                {members.filter((m) => m.status === "Aktif").length}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Tidak Aktif</p>
              <h3 className="fw-bold text-warning mb-0">
                {members.filter((m) => m.status !== "Aktif").length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari nama ahli, email atau kategori..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
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
                <option>Aktif</option>
                <option>Tidak Aktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Jantina</th>
                <th className="px-4 py-3">Umur</th>
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
                      Memuatkan ahli kumpulan...
                    </p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 38, height: 38 }}
                        >
                          {getInitials(member.full_name)}
                        </div>
                        <div>
                          <div className="fw-semibold">{member.full_name}</div>
                          <small className="text-muted">{member.email}</small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted">
                      {member.category}
                    </td>

                    <td className="px-4 py-3">{member.gender}</td>

                    <td className="px-4 py-3">{member.age}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${
                          member.status === "Aktif"
                            ? "bg-success-subtle text-success border border-success-subtle"
                            : "bg-warning-subtle text-warning border border-warning-subtle"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <button
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        onClick={() => setSelectedMember(member)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <a
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        href={`mailto:${member.email}`}
                        title="Email"
                      >
                        <i className="bi bi-envelope"></i>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredMembers.length} daripada {members.length} rekod
        </div>
      </div>

      {selectedMember && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Ahli</h5>
                <button
                  className="btn-close"
                  onClick={() => setSelectedMember(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-2"
                    style={{ width: 64, height: 64, fontSize: 22 }}
                  >
                    {getInitials(selectedMember.full_name)}
                  </div>

                  <h5 className="fw-bold mb-0">{selectedMember.full_name}</h5>
                  <small className="text-muted">{selectedMember.email}</small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedMember.group_name}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kategori</span>
                    <strong>{selectedMember.category}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Umur</span>
                    <strong>{selectedMember.age}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jantina</span>
                    <strong>{selectedMember.gender}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <span
                      className={`badge ${
                        selectedMember.status === "Aktif"
                          ? "bg-success"
                          : "bg-warning"
                      }`}
                    >
                      {selectedMember.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedMember(null)}
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