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
  ic_number?: string;
  race?: string;
  birth_date?: string;
  ppm_state?: string;
  ppm_district?: string;
  group_no?: string;
  school_name?: string;
  unit_pengakap?: string;
  wosm_no?: string;
  created_at?: string;
};

type MemberForm = {
  full_name: string;
  email: string;
  category: string;
  age: string;
  gender: string;
  status: string;
  ic_number: string;
  race: string;
  birth_date: string;
  ppm_state: string;
  ppm_district: string;
  group_no: string;
  school_name: string;
  unit_pengakap: string;
  wosm_no: string;
};

const emptyForm: MemberForm = {
  full_name: "",
  email: "",
  category: "Pengakap Kanak-Kanak",
  age: "",
  gender: "Lelaki",
  status: "Aktif",
  ic_number: "",
  race: "",
  birth_date: "",
  ppm_state: "",
  ppm_district: "",
  group_no: "",
  school_name: "",
  unit_pengakap: "",
  wosm_no: "",
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

function parseCSV(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      row.push(current.trim());
      current = "";

      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  return rows;
}

function normalizeHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "_");
}

function normalizeGender(value: string) {
  const v = value.trim().toLowerCase();
  if (v === "l" || v.includes("lelaki")) return "Lelaki";
  if (v === "p" || v.includes("perempuan")) return "Perempuan";
  return value || "-";
}

function calculateAge(dateString: string) {
  if (!dateString) return 0;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;

  return age;
}

export default function GroupMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");

  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  }, []);

  const groupName = currentUser.group_name || currentUser.district || "";

  useEffect(() => {
    fetchMembers();
  }, []);

  async function addAuditLog(action: string, description: string) {
    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action,
      module: "Ahli Kumpulan",
      description,
    });
  }

  async function fetchMembers() {
    setLoading(true);

    let query = supabase
      .from("members")
      .select("*")
      .order("full_name", { ascending: true });

    if (groupName) query = query.eq("group_name", groupName);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingMember(null);
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function openEditModal(member: Member) {
    setEditingMember(member);

    setForm({
      full_name: member.full_name || "",
      email: member.email || "",
      category: member.category || "Pengakap Kanak-Kanak",
      age: String(member.age || ""),
      gender: member.gender || "Lelaki",
      status: member.status || "Aktif",
      ic_number: member.ic_number || "",
      race: member.race || "",
      birth_date: member.birth_date || "",
      ppm_state: member.ppm_state || "",
      ppm_district: member.ppm_district || "",
      group_no: member.group_no || "",
      school_name: member.school_name || "",
      unit_pengakap: member.unit_pengakap || "",
      wosm_no: member.wosm_no || "",
    });

    setShowAddModal(true);
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault();

    if (!form.full_name.trim()) {
      alert("Nama ahli wajib diisi.");
      return;
    }

    if (!form.category.trim()) {
      alert("Kategori wajib diisi.");
      return;
    }

    if (!groupName) {
      alert("Group pemimpin tidak dijumpai. Sila semak data user login.");
      return;
    }

    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      group_name: groupName,
      category: form.category,
      age: Number(form.age || calculateAge(form.birth_date) || 0),
      gender: form.gender,
      status: form.status,
      ic_number: form.ic_number,
      race: form.race,
      birth_date: form.birth_date || null,
      ppm_state: form.ppm_state,
      ppm_district: form.ppm_district,
      group_no: form.group_no,
      school_name: form.school_name,
      unit_pengakap: form.unit_pengakap || form.category,
      wosm_no: form.wosm_no,
    };

    if (editingMember) {
      const { error } = await supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog("UPDATE", `Kemaskini ahli: ${form.full_name}`);
    } else {
      const { error } = await supabase.from("members").insert(payload);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog("CREATE", `Tambah ahli: ${form.full_name}`);
    }

    await fetchMembers();
    resetForm();
    setShowAddModal(false);
    setSaving(false);
  }

  async function deleteMember() {
    if (!deleteTarget) return;

    setSaving(true);

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog("DELETE", `Padam ahli: ${deleteTarget.full_name}`);

    await fetchMembers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
  }

  async function handleCSVFile(file: File) {
    setCsvFileName(file.name);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      alert("CSV kosong atau format tidak betul.");
      return;
    }

    const headers = rows[0].map(normalizeHeader);

    const requiredHeaders = [
      "nama_penuh_huruf_besar_seperti_dalam_kp",
      "no_kp",
      "jantina",
      "keturunan",
      "tarikh_lahir",
      "ppm_negeri",
      "ppm_daerah",
      "no_kump",
      "nama_sekolah",
      "unit_pengakap",
      "no_wosm",
      "email",
    ];

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      alert(`Header CSV tidak lengkap: ${missingHeaders.join(", ")}`);
      return;
    }

    const parsed = rows
      .slice(1)
      .map((row) => {
        const item: Record<string, string> = {};

        headers.forEach((header, index) => {
          item[header] = row[index] || "";
        });

        const fullName =
          item.nama_penuh_huruf_besar_seperti_dalam_kp?.trim() || "";

        const birthDate = item.tarikh_lahir?.trim() || "";
        const unit = item.unit_pengakap?.trim() || "Ahli Pengakap";

        return {
          full_name: fullName,
          email: item.email?.trim() || "",
          group_name: groupName || item.nama_sekolah?.trim() || "",
          category: unit,
          age: calculateAge(birthDate),
          gender: normalizeGender(item.jantina || ""),
          status: "Aktif",
          ic_number: item.no_kp?.trim() || "",
          race: item.keturunan?.trim() || "",
          birth_date: birthDate || null,
          ppm_state: item.ppm_negeri?.trim() || "",
          ppm_district: item.ppm_daerah?.trim() || "",
          group_no: item.no_kump?.trim() || "",
          school_name: item.nama_sekolah?.trim() || "",
          unit_pengakap: unit,
          wosm_no: item.no_wosm?.trim() || "",
        };
      })
      .filter((member) => member.full_name);

    if (parsed.length === 0) {
      alert("Tiada data valid dijumpai dalam CSV.");
      return;
    }

    setCsvPreview(parsed);
  }

  async function handleImportCSV() {
    if (csvPreview.length === 0) {
      alert("Sila pilih CSV dahulu.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("members").insert(csvPreview);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog("IMPORT", `Import ${csvPreview.length} ahli melalui CSV`);
    await fetchMembers();

    setCsvPreview([]);
    setCsvFileName("");
    setShowImportModal(false);
    setSaving(false);

    alert("Import ahli berjaya.");
  }

  function downloadCSVTemplate() {
    const csv =
      "NAMA PENUH (HURUF BESAR, SEPERTI DALAM K.P.),NO. K.P.,JANTINA,KETURUNAN,TARIKH LAHIR,PPM NEGERI,PPM DAERAH,NO. KUMP,NAMA SEKOLAH,UNIT PENGAKAP,NO. WOSM,EMAIL\n" +
      "ALI BIN ABU,010101-10-1234,L,MELAYU,2012-01-01,Selangor,Petaling,01,SK Kementah,Pengakap Muda,W12345,ali@gmail.com\n" +
      "SITI AMINAH,020202-03-5678,P,MELAYU,2013-02-02,Selangor,Petaling,01,SK Kementah,Pengakap Kanak-Kanak,W67890,siti@gmail.com\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "template_import_ahli_pengakap.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const rows = [
      [
        "Nama",
        "Email",
        "Kumpulan",
        "Kategori",
        "Umur",
        "Jantina",
        "Status",
        "No KP",
        "Keturunan",
        "Tarikh Lahir",
        "No WOSM",
      ],
      ...filteredMembers.map((m) => [
        m.full_name,
        m.email,
        m.group_name,
        m.category,
        m.age,
        m.gender,
        m.status,
        m.ic_number || "",
        m.race || "",
        m.birth_date || "",
        m.wosm_no || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "senarai_ahli_kumpulan.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    alert("Export Excel akan ditambah selepas ini.");
  }
  
  function exportPDF() {
    alert("Export PDF akan ditambah selepas ini.");
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

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-person-plus me-1"></i>
            Tambah Ahli
          </button>
          
          <div className="dropdown">
            <button
              className="btn btn-outline-success dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-gear me-1"></i>
              Tindakan
            </button>
          
            <ul className="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => setShowImportModal(true)}
                >
                  <i className="bi bi-file-earmark-spreadsheet me-2 text-primary"></i>
                  Import CSV
                </button>
              </li>
          
              <li>
                <button className="dropdown-item" type="button" onClick={exportCSV}>
                  <i className="bi bi-download me-2 text-success"></i>
                  Export CSV
                </button>
              </li>
          
              <li>
                <button className="dropdown-item" type="button" onClick={exportExcel}>
                  <i className="bi bi-file-earmark-excel me-2 text-success"></i>
                  Export Excel
                </button>
              </li>
          
              <li>
                <button className="dropdown-item" type="button" onClick={exportPDF}>
                  <i className="bi bi-file-earmark-pdf me-2 text-danger"></i>
                  Export PDF
                </button>
              </li>
          
              <li><hr className="dropdown-divider" /></li>
          
              <li>
                <button className="dropdown-item" type="button" onClick={fetchMembers}>
                  <i className="bi bi-arrow-clockwise me-2 text-secondary"></i>
                  Refresh Data
                </button>
              </li>
            </ul>
          </div>
        </div>
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
                          <small className="text-muted">
                            {member.email || "-"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted">{member.category}</td>
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
                        title="View"
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        onClick={() => openEditModal(member)}
                        title="Edit"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      {member.email && (
                        <a
                          className="btn btn-sm btn-light border rounded-3 me-1"
                          href={`mailto:${member.email}`}
                          title="Email"
                        >
                          <i className="bi bi-envelope"></i>
                        </a>
                      )}

                      <button
                        className="btn btn-sm btn-outline-danger rounded-3"
                        onClick={() => {
                          setDeleteTarget(member);
                          setShowDeleteModal(true);
                        }}
                        title="Delete"
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
          Memaparkan {filteredMembers.length} daripada {members.length} rekod
        </div>
      </div>

      {showAddModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 rounded-4">
              <form onSubmit={saveMember}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">
                      {editingMember ? "Kemaskini Ahli" : "Tambah Ahli"}
                    </h5>
                    <small className="text-muted">
                      Maklumat ahli kumpulan pengakap.
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">Nama Penuh</label>
                      <input
                        className="form-control"
                        value={form.full_name}
                        onChange={(e) =>
                          setForm({ ...form, full_name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">No. K.P.</label>
                      <input
                        className="form-control"
                        value={form.ic_number}
                        onChange={(e) =>
                          setForm({ ...form, ic_number: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Tarikh Lahir</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.birth_date}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            birth_date: e.target.value,
                            age: String(calculateAge(e.target.value)),
                          })
                        }
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label">Umur</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.age}
                        onChange={(e) =>
                          setForm({ ...form, age: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Jantina</label>
                      <select
                        className="form-select"
                        value={form.gender}
                        onChange={(e) =>
                          setForm({ ...form, gender: e.target.value })
                        }
                      >
                        <option>Lelaki</option>
                        <option>Perempuan</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Keturunan</label>
                      <input
                        className="form-control"
                        value={form.race}
                        onChange={(e) =>
                          setForm({ ...form, race: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Kategori / Unit</label>
                      <select
                        className="form-select"
                        value={form.category}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            category: e.target.value,
                            unit_pengakap: e.target.value,
                          })
                        }
                      >
                        <option>Pengakap Kanak-Kanak</option>
                        <option>Pengakap Muda</option>
                        <option>Pengakap Remaja</option>
                        <option>Pengakap Kelana</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">No. WOSM</label>
                      <input
                        className="form-control"
                        value={form.wosm_no}
                        onChange={(e) =>
                          setForm({ ...form, wosm_no: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">PPM Negeri</label>
                      <input
                        className="form-control"
                        value={form.ppm_state}
                        onChange={(e) =>
                          setForm({ ...form, ppm_state: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">PPM Daerah</label>
                      <input
                        className="form-control"
                        value={form.ppm_district}
                        onChange={(e) =>
                          setForm({ ...form, ppm_district: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">No. Kumpulan</label>
                      <input
                        className="form-control"
                        value={form.group_no}
                        onChange={(e) =>
                          setForm({ ...form, group_no: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Nama Sekolah</label>
                      <input
                        className="form-control"
                        value={form.school_name}
                        onChange={(e) =>
                          setForm({ ...form, school_name: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) =>
                          setForm({ ...form, status: e.target.value })
                        }
                      >
                        <option>Aktif</option>
                        <option>Tidak Aktif</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Kumpulan Sistem</label>
                      <input className="form-control" value={groupName} disabled />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    disabled={saving}
                  >
                    Batal
                  </button>

                  <button className="btn btn-success" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan Ahli"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Import Ahli Guna CSV</h5>
                  <small className="text-muted">
                    Format tarikh wajib <strong>YYYY-MM-DD</strong>. Contoh:{" "}
                    <code>2012-01-01</code>
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvPreview([]);
                    setCsvFileName("");
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <div className="alert alert-info rounded-4">
                  <div className="fw-semibold mb-2">Header CSV diperlukan:</div>
                  <code>
                    NAMA PENUH (HURUF BESAR, SEPERTI DALAM K.P.),NO. K.P.,JANTINA,KETURUNAN,TARIKH LAHIR,PPM NEGERI,PPM DAERAH,NO. KUMP,NAMA SEKOLAH,UNIT PENGAKAP,NO. WOSM,EMAIL
                  </code>
                </div>

                <div className="d-flex gap-2 mb-3">
                  <button
                    className="btn btn-outline-success"
                    onClick={downloadCSVTemplate}
                  >
                    <i className="bi bi-download me-1"></i>
                    Download Template CSV
                  </button>

                  <label className="btn btn-primary mb-0">
                    <i className="bi bi-upload me-1"></i>
                    Pilih Fail CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCSVFile(file);
                      }}
                    />
                  </label>
                </div>

                {csvFileName && (
                  <p className="small text-muted mb-3">
                    Fail dipilih: <strong>{csvFileName}</strong>
                  </p>
                )}

                {csvPreview.length > 0 && (
                  <>
                    <h6 className="fw-bold mb-2">
                      Preview Data ({csvPreview.length} rekod)
                    </h6>

                    <div className="table-responsive border rounded-4">
                      <table className="table table-sm table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nama</th>
                            <th>No KP</th>
                            <th>Jantina</th>
                            <th>Tarikh Lahir</th>
                            <th>Umur</th>
                            <th>Unit</th>
                            <th>Email</th>
                          </tr>
                        </thead>

                        <tbody>
                          {csvPreview.slice(0, 10).map((member, index) => (
                            <tr key={index}>
                              <td>{member.full_name}</td>
                              <td>{member.ic_number || "-"}</td>
                              <td>{member.gender}</td>
                              <td>{member.birth_date || "-"}</td>
                              <td>{member.age}</td>
                              <td>{member.category}</td>
                              <td>{member.email || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvPreview([]);
                    setCsvFileName("");
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-success"
                  onClick={handleImportCSV}
                  disabled={saving || csvPreview.length === 0}
                >
                  {saving ? "Mengimport..." : `Import ${csvPreview.length} Ahli`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMember && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Profil Ahli</h5>
                <button
                  className="btn-close"
                  onClick={() => setSelectedMember(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-2"
                    style={{ width: 72, height: 72, fontSize: 24 }}
                  >
                    {getInitials(selectedMember.full_name)}
                  </div>

                  <h5 className="fw-bold mb-0">{selectedMember.full_name}</h5>
                  <small className="text-muted">{selectedMember.email || "-"}</small>
                </div>

                <div className="row g-3">
                  {[
                    ["No. K.P.", selectedMember.ic_number || "-"],
                    ["Tarikh Lahir", selectedMember.birth_date || "-"],
                    ["Umur", selectedMember.age || "-"],
                    ["Jantina", selectedMember.gender || "-"],
                    ["Keturunan", selectedMember.race || "-"],
                    ["Kategori", selectedMember.category || "-"],
                    ["No. WOSM", selectedMember.wosm_no || "-"],
                    ["Kumpulan", selectedMember.group_name || "-"],
                    ["Sekolah", selectedMember.school_name || "-"],
                    ["PPM Negeri", selectedMember.ppm_state || "-"],
                    ["PPM Daerah", selectedMember.ppm_district || "-"],
                    ["Status", selectedMember.status || "-"],
                  ].map(([label, value]) => (
                    <div className="col-md-6" key={label}>
                      <div className="border rounded-3 p-3 h-100">
                        <div className="text-muted small">{label}</div>
                        <div className="fw-semibold">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedMember(null)}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={() => {
                    openEditModal(selectedMember);
                    setSelectedMember(null);
                  }}
                >
                  Edit Ahli
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Padam Ahli</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">Adakah anda pasti mahu padam ahli ini?</p>
                <strong>{deleteTarget.full_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Tindakan ini tidak boleh dibatalkan.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-danger"
                  onClick={deleteMember}
                  disabled={saving}
                >
                  {saving ? "Memadam..." : "Padam"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}