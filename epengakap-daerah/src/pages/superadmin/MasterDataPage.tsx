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

type CurrentUser = {
  id?: string;
  full_name?: string;
  name?: string;
  role?: string;
};

const STATUS_OPTIONS = ["Semua Status", "Aktif", "Tidak Aktif"];

function getCurrentUser(): CurrentUser {
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

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeStatus(value?: string | null) {
  const status = String(value || "Aktif").trim();

  if (status.toLowerCase() === "active") return "Aktif";
  if (status.toLowerCase() === "inactive") return "Tidak Aktif";

  return status || "Aktif";
}

function isActiveStatus(value?: string | null) {
  const status = normalizeStatus(value).toLowerCase();
  return status === "aktif" || status === "active";
}

function getStateName(state?: StateRow | null) {
  if (!state) return "-";
  return state.state_name || state.name || state.state || "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(statusValue?: string | null) {
  if (isActiveStatus(statusValue)) {
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

function cleanDistrictCode(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase()
    .slice(0, 20);
}

export default function MasterDataPage() {
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStateId, setSelectedStateId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRow | null>(
    null
  );

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
        old_value: oldValue || null,
        new_value: newValue || null,
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
          .select(
            "id, state_id, district_name, district_code, status, created_at, updated_at"
          )
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

      if (
        selectedStateId &&
        stateData.length > 0 &&
        !stateData.some((state) => state.id === selectedStateId)
      ) {
        setSelectedStateId(stateData[0].id);
      }
    } catch (error: any) {
      console.error("Failed to fetch master data:", error);
      alert(error?.message || "Gagal mendapatkan data negeri dan daerah.");
    } finally {
      setLoading(false);
    }
  }

  function resetDistrictForm() {
    setDistrictForm({
      id: null,
      district_name: "",
      district_code: "",
      status: "Aktif",
    });
  }

  function closeDistrictModal() {
    if (saving) return;
    resetDistrictForm();
    setShowDistrictModal(false);
  }

  function openAddDistrictModal() {
    if (!selectedStateId) {
      alert("Sila pilih Negeri / Wilayah dahulu.");
      return;
    }

    resetDistrictForm();
    setShowDistrictModal(true);
  }

  function openEditDistrictModal(district: DistrictRow) {
    setDistrictForm({
      id: district.id,
      district_name: district.district_name || "",
      district_code: district.district_code || "",
      status: normalizeStatus(district.status),
    });

    setShowDistrictModal(true);
  }

  function openViewDistrictModal(district: DistrictRow) {
    setSelectedDistrict(district);
    setShowViewModal(true);
  }

  function validateDistrictForm() {
    const districtName = normalizeText(districtForm.district_name);
    const districtCode = cleanDistrictCode(districtForm.district_code);

    if (!selectedStateId) {
      alert("Sila pilih Negeri / Wilayah.");
      return false;
    }

    if (!districtName) {
      alert("Sila isi nama daerah.");
      return false;
    }

    if (districtName.length < 2) {
      alert("Nama daerah terlalu pendek.");
      return false;
    }

    const duplicateName = districts.find((district) => {
      const sameState = district.state_id === selectedStateId;
      const sameName =
        normalizeText(district.district_name).toLowerCase() ===
        districtName.toLowerCase();
      const notCurrent = district.id !== districtForm.id;

      return sameState && sameName && notCurrent;
    });

    if (duplicateName) {
      alert("Daerah ini sudah wujud untuk Negeri / Wilayah yang dipilih.");
      return false;
    }

    if (districtCode) {
      const duplicateCode = districts.find((district) => {
        const sameState = district.state_id === selectedStateId;
        const sameCode =
          normalizeText(district.district_code).toLowerCase() ===
          districtCode.toLowerCase();
        const notCurrent = district.id !== districtForm.id;

        return sameState && sameCode && notCurrent;
      });

      if (duplicateCode) {
        alert("Kod daerah ini sudah digunakan untuk Negeri / Wilayah ini.");
        return false;
      }
    }

    return true;
  }

  async function saveDistrict() {
    if (!validateDistrictForm()) return;

    const districtName = normalizeText(districtForm.district_name);
    const districtCode = cleanDistrictCode(districtForm.district_code);
    const status = normalizeStatus(districtForm.status);

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

      closeDistrictModal();
      await fetchMasterData();

      alert("Data daerah berjaya disimpan.");
    } catch (error: any) {
      alert(error?.message || "Gagal menyimpan data daerah.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDistrictStatus(district: DistrictRow) {
    const nextStatus = isActiveStatus(district.status)
      ? "Tidak Aktif"
      : "Aktif";

    const confirmed = confirm(
      `Adakah anda pasti mahu tukar status "${district.district_name}" kepada ${nextStatus}?`
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

  function exportDistrictsCSV() {
    const selectedStateName = selectedState ? getStateName(selectedState) : "-";

    const headers = [
      "BIL",
      "NEGERI / WILAYAH",
      "DAERAH",
      "KOD DAERAH",
      "STATUS",
      "DICIPTA PADA",
      "DIKEMASKINI PADA",
    ];

    const rows = filteredDistricts.map((district, index) => [
      index + 1,
      selectedStateName,
      district.district_name || "",
      district.district_code || "",
      normalizeStatus(district.status),
      district.created_at || "",
      district.updated_at || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `senarai-daerah-${selectedStateName
      .toLowerCase()
      .replace(/\s+/g, "-")}.csv`;

    link.click();
    URL.revokeObjectURL(url);
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
        normalizeText(district.district_name)
          .toLowerCase()
          .includes(keyword) ||
        normalizeText(district.district_code).toLowerCase().includes(keyword);

      const normalizedStatus = normalizeStatus(district.status);
      const matchStatus =
        statusFilter === "Semua Status" || normalizedStatus === statusFilter;

      return matchState && matchSearch && matchStatus;
    });
  }, [districts, selectedStateId, search, statusFilter]);

  const selectedStateDistricts = useMemo(() => {
    return districts.filter((district) => district.state_id === selectedStateId);
  }, [districts, selectedStateId]);

  const activeDistrictCount = selectedStateDistricts.filter((district) =>
    isActiveStatus(district.status)
  ).length;

  const inactiveDistrictCount =
    selectedStateDistricts.length - activeDistrictCount;

  const overallActiveDistrictCount = districts.filter((district) =>
    isActiveStatus(district.status)
  ).length;

  const overallInactiveDistrictCount =
    districts.length - overallActiveDistrictCount;

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

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-outline-secondary"
            onClick={exportDistrictsCSV}
            disabled={loading || filteredDistricts.length === 0}
          >
            <i className="bi bi-download me-1"></i>
            Export CSV
          </button>

          <button
            className="btn btn-outline-success"
            onClick={fetchMasterData}
            disabled={loading || saving}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
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
              subtitle="Master negeri tersedia"
              icon="bi-map"
              color="success"
            />

            <SummaryCard
              title="Jumlah Daerah"
              value={districts.length}
              subtitle="Semua negeri / wilayah"
              icon="bi-geo-alt"
              color="primary"
            />

            <SummaryCard
              title="Daerah Aktif"
              value={overallActiveDistrictCount}
              subtitle="Boleh digunakan"
              icon="bi-check-circle"
              color="success"
            />

            <SummaryCard
              title="Tidak Aktif"
              value={overallInactiveDistrictCount}
              subtitle="Disembunyikan / tidak digunakan"
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
                    Pilih negeri untuk lihat dan urus daerah.
                  </p>
                </div>

                <div className="card-body p-4 pt-0">
                  {states.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="bi bi-map fs-1 d-block mb-2"></i>
                      Tiada data negeri / wilayah.
                    </div>
                  ) : (
                    <div className="list-group">
                      {states.map((state) => {
                        const stateName = getStateName(state);

                        const stateDistricts = districts.filter(
                          (district) => district.state_id === state.id
                        );

                        const stateActiveCount = stateDistricts.filter(
                          (district) => isActiveStatus(district.status)
                        ).length;

                        return (
                          <button
                            key={state.id}
                            type="button"
                            className={`list-group-item list-group-item-action border rounded-4 mb-2 ${
                              selectedStateId === state.id
                                ? "active bg-success border-success"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedStateId(state.id);
                              setSearch("");
                              setStatusFilter("Semua Status");
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start gap-3">
                              <div>
                                <div className="fw-semibold">{stateName}</div>
                                <small
                                  className={
                                    selectedStateId === state.id
                                      ? "text-white-50"
                                      : "text-muted"
                                  }
                                >
                                  {stateActiveCount} aktif daripada{" "}
                                  {stateDistricts.length} daerah
                                </small>
                              </div>

                              <span
                                className={`badge rounded-pill ${
                                  selectedStateId === state.id
                                    ? "bg-light text-success"
                                    : "bg-success-subtle text-success border border-success-subtle"
                                }`}
                              >
                                {stateDistricts.length}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white border-0 p-4">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">
                        Senarai Daerah
                        {selectedState ? ` - ${getStateName(selectedState)}` : ""}
                      </h5>

                      <p className="text-muted small mb-0">
                        {activeDistrictCount} aktif, {inactiveDistrictCount}{" "}
                        tidak aktif untuk negeri / wilayah ini.
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

                  <div className="row g-2 mt-3">
                    <div className="col-md-8">
                      <div className="position-relative">
                        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                        <input
                          className="form-control ps-5 rounded-3"
                          placeholder="Cari nama daerah atau kod daerah..."
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <select
                        className="form-select rounded-3"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase small text-muted">
                      <tr>
                        <th className="px-4 py-3">Daerah</th>
                        <th className="px-4 py-3">Kod</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Kemaskini</th>
                        <th className="px-4 py-3 text-end">Tindakan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredDistricts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-5 text-muted"
                          >
                            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                            Tiada daerah dijumpai.
                          </td>
                        </tr>
                      ) : (
                        filteredDistricts.map((district) => (
                          <tr key={district.id}>
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                                  style={{ width: 42, height: 42 }}
                                >
                                  {(district.district_name || "-")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <div className="fw-semibold">
                                    {district.district_name || "-"}
                                  </div>
                                  <small className="text-muted">
                                    {selectedState
                                      ? getStateName(selectedState)
                                      : "-"}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {district.district_code ? (
                                <span className="badge rounded-pill bg-light text-dark border px-3 py-2">
                                  {district.district_code}
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {getStatusBadge(district.status)}
                            </td>

                            <td className="px-4 py-3">
                              <small className="text-muted">
                                {formatDate(
                                  district.updated_at || district.created_at
                                )}
                              </small>
                            </td>

                            <td className="px-4 py-3 text-end">
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-light border"
                                  onClick={() => openViewDistrictModal(district)}
                                  disabled={saving}
                                  title="Lihat"
                                >
                                  <i className="bi bi-eye text-primary"></i>
                                </button>

                                <button
                                  className="btn btn-light border"
                                  onClick={() => openEditDistrictModal(district)}
                                  disabled={saving}
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil-square text-secondary"></i>
                                </button>

                                <button
                                  className="btn btn-light border"
                                  onClick={() => toggleDistrictStatus(district)}
                                  disabled={saving}
                                  title="Tukar Status"
                                >
                                  <i
                                    className={`bi ${
                                      isActiveStatus(district.status)
                                        ? "bi-pause-circle text-warning"
                                        : "bi-check-circle text-success"
                                    }`}
                                  ></i>
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
                  Memaparkan {filteredDistricts.length} daripada{" "}
                  {selectedStateDistricts.length} daerah untuk{" "}
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
                  onClick={closeDistrictModal}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body p-4">
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
                    autoFocus
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
                        district_code: cleanDistrictCode(event.target.value),
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

                <div className="alert alert-info rounded-4 small mt-4 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Data daerah ini akan digunakan semasa pendaftaran district
                  environment.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={closeDistrictModal}
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
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDistrict(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                    style={{ width: 76, height: 76, fontSize: 24 }}
                  >
                    {(selectedDistrict.district_name || "-")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <h5 className="fw-bold mb-1">
                    {selectedDistrict.district_name || "-"}
                  </h5>

                  <small className="text-muted">
                    {selectedState ? getStateName(selectedState) : "-"}
                  </small>
                </div>

                <div className="list-group list-group-flush">
                  <InfoRow
                    label="Negeri / Wilayah"
                    value={selectedState ? getStateName(selectedState) : "-"}
                  />

                  <InfoRow
                    label="Nama Daerah"
                    value={selectedDistrict.district_name || "-"}
                  />

                  <InfoRow
                    label="Kod Daerah"
                    value={selectedDistrict.district_code || "-"}
                  />

                  <div className="list-group-item d-flex justify-content-between align-items-center gap-3">
                    <span className="text-muted">Status</span>
                    {getStatusBadge(selectedDistrict.status)}
                  </div>

                  <InfoRow
                    label="Dicipta Pada"
                    value={formatDate(selectedDistrict.created_at)}
                  />

                  <InfoRow
                    label="Dikemaskini Pada"
                    value={formatDate(selectedDistrict.updated_at)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDistrict(null);
                  }}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditDistrictModal(selectedDistrict);
                  }}
                >
                  Edit
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
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="col-md-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <div>
              <p className="text-muted small mb-1">{title}</p>
              <h3 className={`fw-bold text-${color} mb-0`}>{value}</h3>
              <small className="text-muted">{subtitle}</small>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-group-item d-flex justify-content-between gap-3">
      <span className="text-muted">{label}</span>
      <strong className="text-end">{value}</strong>
    </div>
  );
}