import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type AssistantLeader = {
  id: string;
  full_name: string | null;
  email: string | null;
  password?: string | null;
  phone?: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  profile_image_url?: string | null;
};

type AssistantLeaderForm = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
};

type CurrentUser = {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  district?: string;
  district_environment_id?: string;
  group_id?: string;
  group_name?: string;
};

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];

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

function getInitials(name?: string | null) {
  return String(name || "-")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (value === "inactive" || value === "tidak aktif") return "Tidak Aktif";

  return status || "Aktif";
}

function normalizeMalaysiaPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatMalaysiaPhone(value: string) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits) return "";

  if (digits.startsWith("03")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  if (digits.startsWith("011")) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function isValidMalaysiaPhone(value: string) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits) return true;
  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null,
  oldValue?: any,
  newValue?: any
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name || currentUser.name || "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action,
      module: "Penolong Pemimpin",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
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

export default function AssistantLeadersPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [assistants, setAssistants] = useState<AssistantLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [editingAssistant, setEditingAssistant] =
    useState<AssistantLeader | null>(null);
  const [selectedAssistant, setSelectedAssistant] =
    useState<AssistantLeader | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<AssistantLeader | null>(null);

  const [form, setForm] = useState<AssistantLeaderForm>({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchAssistants();
  }, []);

  async function fetchAssistants() {
    setLoading(true);

    if (!groupId && !groupName) {
      setAssistants([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("system_users")
      .select("*")
      .eq("role", "Penolong Pemimpin")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", groupName);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setAssistants([]);
      setLoading(false);
      return;
    }

    setAssistants(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const active = assistants.filter(
      (assistant) => normalizeStatus(assistant.status) === "Aktif"
    ).length;

    const inactive = assistants.filter(
      (assistant) => normalizeStatus(assistant.status) === "Tidak Aktif"
    ).length;

    return {
      total: assistants.length,
      active,
      inactive,
    };
  }, [assistants]);

  const filteredAssistants = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return assistants.filter((assistant) => {
      const status = normalizeStatus(assistant.status);

      const matchSearch =
        !keyword ||
        String(assistant.full_name || "").toLowerCase().includes(keyword) ||
        String(assistant.email || "").toLowerCase().includes(keyword) ||
        String(assistant.phone || "").includes(search.replace(/\D/g, "")) ||
        formatMalaysiaPhone(assistant.phone || "")
          .toLowerCase()
          .includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [assistants, search, statusFilter]);

  function resetForm() {
    setEditingAssistant(null);

    setForm({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(assistant: AssistantLeader) {
    setEditingAssistant(assistant);

    setForm({
      full_name: assistant.full_name || "",
      email: assistant.email || "",
      phone: formatMalaysiaPhone(assistant.phone || ""),
      password: "",
      status: normalizeStatus(assistant.status),
    });

    setShowModal(true);
  }

  function openViewModal(assistant: AssistantLeader) {
    setSelectedAssistant(assistant);
    setShowViewModal(true);
  }

  function openDeactivateModal(assistant: AssistantLeader) {
    setDeactivateTarget(assistant);
    setShowDeactivateModal(true);
  }

  function validateForm() {
    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = form.password.trim();

    if (!fullName) {
      alert("Sila isi nama penuh Penolong Pemimpin.");
      return false;
    }

    if (fullName.length < 3) {
      alert("Nama penuh mestilah sekurang-kurangnya 3 aksara.");
      return false;
    }

    if (!email) {
      alert("Sila isi email.");
      return false;
    }

    if (!isValidEmail(email)) {
      alert("Format email tidak sah.");
      return false;
    }

    if (phone && !isValidMalaysiaPhone(phone)) {
      alert(
        "Nombor telefon tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return false;
    }

    if (!editingAssistant && !password) {
      alert("Sila isi kata laluan untuk akaun baru.");
      return false;
    }

    if (password && password.length < 6) {
      alert("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
      return false;
    }

    if (!groupId && !groupName) {
      alert("Akaun Pemimpin Kumpulan belum dipautkan dengan kumpulan.");
      return false;
    }

    if (!districtEnvironmentId) {
      alert("Akaun belum dipautkan dengan district environment.");
      return false;
    }

    return true;
  }

  async function checkDuplicateEmail(email: string, ignoreUserId?: string) {
    let query = supabase
      .from("system_users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .is("deleted_at", null)
      .limit(1);

    if (ignoreUserId) {
      query = query.neq("id", ignoreUserId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function saveAssistant() {
    if (!validateForm()) return;

    setSaving(true);

    const cleanEmail = form.email.trim().toLowerCase();

    const duplicateEmail = await checkDuplicateEmail(
      cleanEmail,
      editingAssistant?.id
    );

    if (duplicateEmail) {
      alert("Email ini sudah digunakan oleh pengguna lain.");
      setSaving(false);
      return;
    }

    const payload: any = {
      full_name: form.full_name.trim(),
      email: cleanEmail,
      phone: normalizeMalaysiaPhone(form.phone) || null,
      role: "Penolong Pemimpin",
      district: district || null,
      district_environment_id: districtEnvironmentId,
      group_id: groupId || null,
      group_name: groupName || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    if (editingAssistant) {
      let updateQuery = supabase
        .from("system_users")
        .update(payload)
        .eq("id", editingAssistant.id)
        .eq("role", "Penolong Pemimpin")
        .eq("district_environment_id", districtEnvironmentId)
        .is("deleted_at", null);

      if (groupId) {
        updateQuery = updateQuery.eq("group_id", groupId);
      } else {
        updateQuery = updateQuery.eq("group_name", groupName);
      }

      const { error } = await updateQuery;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini Penolong Pemimpin: ${form.full_name}`,
        editingAssistant.id,
        editingAssistant,
        payload
      );
    } else {
      const { data, error } = await supabase
        .from("system_users")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
          deleted_at: null,
        })
        .select("id")
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "CREATE",
        `Tambah Penolong Pemimpin: ${form.full_name}`,
        data?.id || null,
        null,
        payload
      );
    }

    await fetchAssistants();
    resetForm();
    setShowModal(false);
    setSaving(false);

    alert(
      editingAssistant
        ? "Penolong Pemimpin berjaya dikemaskini."
        : "Penolong Pemimpin berjaya ditambah."
    );
  }

  async function deactivateAssistant() {
    if (!deactivateTarget) return;

    setSaving(true);

    let updateQuery = supabase
      .from("system_users")
      .update({
        status: "Tidak Aktif",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", deactivateTarget.id)
      .eq("role", "Penolong Pemimpin")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (groupId) {
      updateQuery = updateQuery.eq("group_id", groupId);
    } else {
      updateQuery = updateQuery.eq("group_name", groupName);
    }

    const { error } = await updateQuery;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      `Nyahaktif Penolong Pemimpin: ${deactivateTarget.full_name}`,
      deactivateTarget.id,
      deactivateTarget,
      {
        status: "Tidak Aktif",
        deleted_at: new Date().toISOString(),
      }
    );

    await fetchAssistants();

    setShowDeactivateModal(false);
    setDeactivateTarget(null);
    setSaving(false);

    alert("Penolong Pemimpin berjaya dinyahaktif.");
  }

  function exportCSV() {
    const headers = [
      "BIL",
      "NAMA PENUH",
      "EMAIL",
      "NO TELEFON",
      "ROLE",
      "KUMPULAN",
      "DAERAH",
      "STATUS",
      "TARIKH DAFTAR",
    ];

    const rows = filteredAssistants.map((assistant, index) => [
      index + 1,
      assistant.full_name || "",
      assistant.email || "",
      formatMalaysiaPhone(assistant.phone || ""),
      assistant.role || "",
      assistant.group_name || "",
      assistant.district || "",
      normalizeStatus(assistant.status),
      assistant.created_at || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `penolong-pemimpin-${groupName || "kumpulan"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (!groupId && !groupName) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pesuruhjaya
          Daerah untuk kemaskini kumpulan anda.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Penolong Pemimpin</h2>
          <p className="text-muted mb-0">
            Urus Penolong Pemimpin untuk kumpulan{" "}
            <strong>{groupName || "-"}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={exportCSV}
            disabled={loading || filteredAssistants.length === 0}
          >
            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
            Export CSV
          </button>

          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-person-plus me-1"></i>
            Tambah Penolong
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Penolong</small>
              <h3 className="fw-bold mb-0">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h3 className="fw-bold text-success mb-0">{stats.active}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Aktif</small>
              <h3 className="fw-bold text-secondary mb-0">{stats.inactive}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-7">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari nama, email atau telefon..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Semua Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("Semua Status");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Daftar</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan Penolong Pemimpin...
                    </p>
                  </td>
                </tr>
              ) : filteredAssistants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-person-plus fs-1 d-block mb-2"></i>
                    Tiada Penolong Pemimpin dijumpai.
                  </td>
                </tr>
              ) : (
                filteredAssistants.map((assistant) => (
                  <tr key={assistant.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{
                            width: 40,
                            height: 40,
                            overflow: "hidden",
                          }}
                        >
                          {assistant.profile_image_url ? (
                            <img
                              src={assistant.profile_image_url}
                              alt={assistant.full_name || "-"}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            getInitials(assistant.full_name)
                          )}
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {assistant.full_name || "-"}
                          </div>
                          <small className="text-muted">
                            {assistant.role || "Penolong Pemimpin"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">{assistant.email || "-"}</td>
                    <td className="px-4 py-3">
                      {formatMalaysiaPhone(assistant.phone || "") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {assistant.group_name || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill ${
                          normalizeStatus(assistant.status) === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(assistant.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {formatDate(assistant.created_at)}
                    </td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-light border"
                          onClick={() => openViewModal(assistant)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye text-primary"></i>
                        </button>

                        <button
                          className="btn btn-light border"
                          onClick={() => openEditModal(assistant)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square text-secondary"></i>
                        </button>

                        <button
                          className="btn btn-light border"
                          onClick={() => openDeactivateModal(assistant)}
                          title="Nyahaktif"
                        >
                          <i className="bi bi-person-dash text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingAssistant
                      ? "Edit Penolong Pemimpin"
                      : "Tambah Penolong Pemimpin"}
                  </h5>
                  <small className="text-muted">
                    Akaun akan dipautkan kepada kumpulan {groupName || "-"}.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.full_name}
                      onChange={(event) =>
                        setForm({ ...form, full_name: event.target.value })
                      }
                      placeholder="Nama penuh"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      maxLength={13}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: formatMalaysiaPhone(event.target.value),
                        })
                      }
                      placeholder="012-345 6789"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Kata Laluan{" "}
                      {editingAssistant && (
                        <span className="text-muted small">
                          optional kalau nak tukar
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(event) =>
                        setForm({ ...form, password: event.target.value })
                      }
                      placeholder={
                        editingAssistant
                          ? "Kosongkan jika tidak mahu tukar"
                          : "Minimum 6 aksara"
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <input
                      className="form-control bg-light"
                      value="Penolong Pemimpin"
                      readOnly
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Daerah</label>
                    <input
                      className="form-control bg-light"
                      value={district || "-"}
                      readOnly
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <input
                      className="form-control bg-light"
                      value={groupName || "-"}
                      readOnly
                    />
                  </div>
                </div>

                <div className="alert alert-info rounded-4 small mt-4 mb-0">
                  <i className="bi bi-shield-check me-2"></i>
                  Penolong Pemimpin ini hanya akan mempunyai akses kepada
                  kumpulan <strong>{groupName || "-"}</strong> sahaja.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveAssistant}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingAssistant
                    ? "Kemaskini"
                    : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedAssistant && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Maklumat Penolong Pemimpin
                </h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAssistant(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                    style={{
                      width: 82,
                      height: 82,
                      fontSize: 26,
                      overflow: "hidden",
                    }}
                  >
                    {selectedAssistant.profile_image_url ? (
                      <img
                        src={selectedAssistant.profile_image_url}
                        alt={selectedAssistant.full_name || "-"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      getInitials(selectedAssistant.full_name)
                    )}
                  </div>

                  <h5 className="fw-bold mb-1">
                    {selectedAssistant.full_name || "-"}
                  </h5>

                  <small className="text-muted">
                    {selectedAssistant.email || "-"}
                  </small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Telefon</span>
                    <strong>
                      {formatMalaysiaPhone(selectedAssistant.phone || "") ||
                        "-"}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Role</span>
                    <strong>
                      {selectedAssistant.role || "Penolong Pemimpin"}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <strong>{normalizeStatus(selectedAssistant.status)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Daerah</span>
                    <strong>{selectedAssistant.district || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedAssistant.group_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Tarikh Daftar</span>
                    <strong>{formatDate(selectedAssistant.created_at)}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAssistant(null);
                  }}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedAssistant);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && deactivateTarget && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Nyahaktif Penolong Pemimpin
                </h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateTarget(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif akaun ini?
                </p>

                <strong>{deactivateTarget.full_name || "-"}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Akaun tidak dipadam kekal. Status akan ditukar kepada Tidak
                  Aktif dan rekod disimpan sebagai audit.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateTarget(null);
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-danger"
                  onClick={deactivateAssistant}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}