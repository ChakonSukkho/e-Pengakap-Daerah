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

export default function ACMemberManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchSearch =
        member.full_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        member.group_name
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "Semua" ||
        member.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [members, search, statusFilter]);

  const activeMembers = members.filter(
    (m) => m.status === "Aktif"
  ).length;

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Pengurusan Ahli Daerah
          </h2>
          <p className="text-muted mb-0">
            Paparan semua ahli pengakap dalam daerah.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchMembers}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">
                Jumlah Ahli
              </div>
              <h3 className="fw-bold">
                {members.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">
                Ahli Aktif
              </div>
              <h3 className="fw-bold text-success">
                {activeMembers}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">
                Tidak Aktif
              </div>
              <h3 className="fw-bold text-warning">
                {members.length - activeMembers}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body border-bottom">
          <div className="row g-3">
            <div className="col-md-8">
              <input
                className="form-control"
                placeholder="Cari ahli atau kumpulan..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option>Semua</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Nama</th>
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-5"
                  >
                    <div className="spinner-border text-success"></div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-5 text-muted"
                  >
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="fw-semibold">
                      {member.full_name}
                    </td>

                    <td>{member.group_name}</td>

                    <td>{member.category}</td>

                    <td>{member.age}</td>

                    <td>
                      <span
                        className={`badge ${
                          member.status === "Aktif"
                            ? "bg-success"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() =>
                          setSelectedMember(member)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <div
          className="modal d-block"
          style={{
            background: "rgba(0,0,0,.55)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title">
                  Maklumat Ahli
                </h5>

                <button
                  className="btn-close"
                  onClick={() =>
                    setSelectedMember(null)
                  }
                />
              </div>

              <div className="modal-body">
                <p>
                  <strong>Nama:</strong>{" "}
                  {selectedMember.full_name}
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  {selectedMember.email}
                </p>

                <p>
                  <strong>Kumpulan:</strong>{" "}
                  {selectedMember.group_name}
                </p>

                <p>
                  <strong>Kategori:</strong>{" "}
                  {selectedMember.category}
                </p>

                <p>
                  <strong>Umur:</strong>{" "}
                  {selectedMember.age}
                </p>

                <p>
                  <strong>Jantina:</strong>{" "}
                  {selectedMember.gender}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {selectedMember.status}
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setSelectedMember(null)
                  }
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