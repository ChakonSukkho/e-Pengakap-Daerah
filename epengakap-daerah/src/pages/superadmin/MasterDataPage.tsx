import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type StateRow = {
  id: string;
  state_name?: string | null;
  name?: string | null;
  state?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DistrictRow = {
  id: string;
  state_id: string;
  district_name: string | null;
  district_code: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DistrictForm = {
  id: string | null;
  district_name: string;
  district_code: string;
  status: string;
};

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeStatus(value?: string | null) {
  return String(value || "Aktif").trim();
}

function getStateName(state: StateRow) {
  return state.state_name || state.name || state.state || "-";
}

function getStatusBadge(statusValue?: string | null) {
  const status = normalizeStatus(statusValue).toLowerCase();

  if (status === "aktif" || status === "active") {
    return (
      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
        Aktif
      </span>
    );
  }

  return (
    <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
      Tidak Aktif
    </span>
  );
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

export default function MasterDataPage() {
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStateId, setSelectedStateId] = useState("");
  const [search, setSearch] = useState("");

  const [showDistrictModal, setShowDistrictModal] = useState(false);

  const [districtForm, setDistrictForm] = useState<DistrictForm>({
    id: null,
    district_name: "",
    district_code: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  async function addAuditLog(
    action: string,
    description: string,
    recordId?: string | null,
    oldValue?: unknown,
    newValue?: unknown
  ) {
    try {
      const user = getCurrentUser();

      await supabase.from("audit_logs").insert({
        actor_name: user.full_name || user.name || "Super Admin",
        actor_role: user.role || "Super Admin",
        action,
        module: "Data Negeri & Daerah",
        description,
        user_id: user.id || null,
        district_environment_id: null,
        record_id: recordId || null,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Jangan block proses utama kalau audit log gagal.
    }
  }

  async function fetchMasterData() {
    setLoading(true);

    try {
      const [statesResult, districtsResult] = await Promise.all([
        supabase.from("states").select("*").order("state_name", {
          ascending: true,
        }),

        supabase
          .from("districts")
          .select("id, state_id, district_name, district_code, status, created_at, updated_at")
          .order("district_name", { ascending: true }),
      ]);

      if (statesResult.error) throw statesResult.error;
      if (districtsResult.error) throw districtsResult.error;

      const stateData = statesResult.data || [];
      const districtData = districtsResult.data || [];

      setStates(stateData);
      setDistricts(districtData);

      if (!selectedStateId && stateData.length > 0) {
        setSelectedStateId(stateData[0].id);
      }
    } catch (error: any) {
      console.error("Failed to fetch master data:", error);
      alert(error?.message || "Gagal mendapatkan data negeri dan daerah.");
    } finally {
      setLoading(false);
    }
  }

  function openAddDistrictModal() {
    if (!selectedStateId) {
      alert("Sila pilih Negeri / Wilayah dahulu.");
      return;
    }

    setDistrictForm({
      id: null,
      district_name: "",
      district_code: "",
      status: "Aktif",
    });

    setShowDistrictModal(true);
  }

  function openEditDistrictModal(district: DistrictRow) {
    setDistrictForm({
      id: district.id,
      district_name: district.district_name || "",
      district_code: district.district_code || "",
      status: district.status || "Aktif",
    });

    setShowDistrictModal(true);
  }

  async function saveDistrict() {
    const districtName = normalizeText(districtForm.district_name);
    const districtCode = normalizeText(districtForm.district_code).toUpperCase();
    const status = normalizeText(districtForm.status) || "Aktif";

    if (!selectedStateId) {
      alert("Sila pilih Negeri / Wilayah.");
      return;
    }

    if (!districtName) {
      alert("Sila isi nama daerah.");
      return;
    }

    const duplicate = districts.find((district) => {
      const sameState = district.state_id === selectedStateId;
      const sameName =
        normalizeText(district.district_name).toLowerCase() ===
        districtName.toLowerCase();
      const notCurrent = district.id !== districtForm.id;

      return sameState && sameName && notCurrent;
    });

    if (duplicate) {
      alert("Daerah ini sudah wujud untuk Negeri / Wilayah yang dipilih.");
      return;
    }

    setSaving(true);

    try {
      if (districtForm.id) {
        const oldDistrict = districts.find(
          (district) => district.id === districtForm.id
        );

        const payload = {
          district_name: districtName,
          district_code: districtCode || null,
          status,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("districts")
          .update(payload)
          .eq("id", districtForm.id);

        if (error) throw error;

        await addAuditLog(
          "UPDATE",
          `Kemaskini daerah ${districtName}.`,
          districtForm.id,
          oldDistrict,
          payload
        );
      } else {
        const payload = {
          state_id: selectedStateId,
          district_name: districtName,
          district_code: districtCode || null,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("districts")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        await addAuditLog(
          "CREATE",
          `Tambah daerah baharu ${districtName}.`,
          data?.id || null,
          null,
          payload
        );
      }

      setShowDistrictModal(false);
      await fetchMasterData();
      alert("Data daerah berjaya disimpan.");
    } catch (error: any) {
      alert(error?.message || "Gagal menyimpan data daerah.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDistrictStatus(district: DistrictRow) {
    const currentStatus = normalizeStatus(district.status).toLowerCase();
    const nextStatus =
      currentStatus === "aktif" || currentStatus === "active"
        ? "Tidak Aktif"
        : "Aktif";

    const confirmed = confirm(
      `Adakah anda pasti mahu tukar status ${district.district_name} kepada ${nextStatus}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const payload = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("districts")
        .update(payload)
        .eq("id", district.id);

      if (error) throw error;

      await addAuditLog(
        nextStatus === "Aktif" ? "ACTIVATE" : "DEACTIVATE",
        `Tukar status daerah ${district.district_name} kepada ${nextStatus}.`,
        district.id,
        district,
        payload
      );

      await fetchMasterData();
    } catch (error: any) {
      alert(error?.message || "Gagal menukar status daerah.");
    } finally {
      setSaving(false);
    }
  }

  const selectedState = useMemo(() => {
    return states.find((state) => state.id === selectedStateId) || null;
  }, [states, selectedStateId]);

  const filteredDistricts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return districts.filter((district) => {
      const matchState = district.state_id === selectedStateId;

      const matchSearch =
        !keyword ||
        normalizeText(district.district_name).toLowerCase().includes(keyword) ||
        normalizeText(district.district_code).toLowerCase().includes(keyword);

      return matchState && matchSearch;
    });
  }, [districts, selectedStateId, search]);

  const activeDistrictCount = filteredDistricts.filter((district) => {
    const status = normalizeStatus(district.status).toLowerCase();
    return status === "aktif" || status === "active";
  }).length;

  const inactiveDistrictCount = filteredDistricts.length - activeDistrictCount;

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Data Negeri & Daerah</h2>
          <p className="text-muted mb-0">
            Urus master data Negeri / Wilayah dan daerah untuk pendaftaran
            environment.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchMasterData}
          disabled={loading || saving}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">
              Memuatkan data Negeri / Wilayah dan daerah...
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <SummaryCard
              title="Negeri / Wilayah"
              value={states.length}
              icon="bi-map"
              color="success"
            />

            <SummaryCard
              title="Jumlah Daerah"
              value={districts.length}
              icon="bi-geo-alt"
              color="primary"
            />

            <SummaryCard
              title="Daerah Aktif"
              value={activeDistrictCount}
              icon="bi-check-circle"
              color="success"
            />

            <SummaryCard
              title="Tidak Aktif"
              value={inactiveDistrictCount}
              icon="bi-pause-circle"
              color="danger"
            />
          </div>

          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 p-4">
                  <h5 className="fw-bold mb-1">Negeri / Wilayah</h5>
                  <p className="text-muted small mb-0">
                    Pilih satu untuk lihat senarai daerah.
                  </p>
                </div>

                <div className="card-body p-4 pt-0">
                  <div className="list-group">
                    {states.map((state) => {
                      const stateName = getStateName(state);
                      const totalDistrict = districts.filter(
                        (district) => district.state_id === state.id
                      ).length;

                      return (
                        <button
                          key={state.id}
                          type="button"
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                            selectedStateId === state.id ? "active" : ""
                          }`}
                          onClick={() => {
                            setSelectedStateId(state.id);
                            setSearch("");
                          }}
                        >
                          <span>{stateName}</span>
                          <span className="badge bg-light text-dark border">
                            {totalDistrict}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white border-0 p-4">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">
                        Senarai Daerah
                        {selectedState ? ` - ${getStateName(selectedState)}` : ""}
                      </h5>
                      <p className="text-muted small mb-0">
                        Tambah, edit dan nyahaktif master daerah.
                      </p>
                    </div>

                    <button
                      className="btn btn-success rounded-pill px-3"
                      onClick={openAddDistrictModal}
                      disabled={saving || !selectedStateId}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Tambah Daerah
                    </button>
                  </div>

                  <div className="position-relative mt-3">
                    <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input
                      className="form-control ps-5 rounded-3"
                      placeholder="Cari nama daerah atau kod daerah..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase small text-muted">
                      <tr>
                        <th className="px-4 py-3">Daerah</th>
                        <th className="px-4 py-3">Kod</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-end">Tindakan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredDistricts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-5 text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                            Tiada daerah dijumpai.
                          </td>
                        </tr>
                      ) : (
                        filteredDistricts.map((district) => (
                          <tr key={district.id}>
                            <td className="px-4 py-3">
                              <div className="fw-semibold">
                                {district.district_name || "-"}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {district.district_code || "-"}
                            </td>

                            <td className="px-4 py-3">
                              {getStatusBadge(district.status)}
                            </td>

                            <td className="px-4 py-3 text-end">
                              <div className="d-flex justify-content-end gap-2 flex-wrap">
                                <button
                                  className="btn btn-sm btn-outline-success rounded-pill px-3"
                                  onClick={() => openEditDistrictModal(district)}
                                  disabled={saving}
                                >
                                  <i className="bi bi-pencil-square me-1"></i>
                                  Edit
                                </button>

                                <button
                                  className="btn btn-sm btn-outline-warning rounded-pill px-3"
                                  onClick={() => toggleDistrictStatus(district)}
                                  disabled={saving}
                                >
                                  <i className="bi bi-power me-1"></i>
                                  Tukar Status
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer bg-white border-top p-4 small text-muted">
                  Memaparkan {filteredDistricts.length} daerah untuk{" "}
                  {selectedState ? getStateName(selectedState) : "-"}.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showDistrictModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {districtForm.id ? "Edit Daerah" : "Tambah Daerah"}
                  </h5>
                  <small className="text-muted">
                    Negeri / Wilayah:{" "}
                    {selectedState ? getStateName(selectedState) : "-"}
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => setShowDistrictModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nama Daerah *</label>
                  <input
                    className="form-control"
                    value={districtForm.district_name}
                    onChange={(event) =>
                      setDistrictForm({
                        ...districtForm,
                        district_name: event.target.value,
                      })
                    }
                    placeholder="Contoh: Kulim"
                    disabled={saving}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Kod Daerah</label>
                  <input
                    className="form-control text-uppercase"
                    value={districtForm.district_code}
                    onChange={(event) =>
                      setDistrictForm({
                        ...districtForm,
                        district_code: event.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Contoh: KLM"
                    disabled={saving}
                  />
                  <small className="text-muted">
                    Optional. Boleh kosongkan jika belum ada kod rasmi.
                  </small>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={districtForm.status}
                    onChange={(event) =>
                      setDistrictForm({
                        ...districtForm,
                        status: event.target.value,
                      })
                    }
                    disabled={saving}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowDistrictModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveDistrict}
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <div className="col-md-6 col-xl-3">
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