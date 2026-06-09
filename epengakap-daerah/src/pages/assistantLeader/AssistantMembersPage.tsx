import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string | null;
  ic_number?: string | null;
  email?: string | null;
  phone?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  unit_pengakap?: string | null;
  race?: string | null;
  birth_date?: string | null;
  wosm_no?: string | null;
  age?: number | null;
  gender?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type MemberForm = {
  full_name: string;
  ic_number: string;
  email: string;
  phone: string;
  category: string;
  age: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
  notes: string;
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
const GENDER_OPTIONS = ["Lelaki", "Perempuan"];

const CATEGORY_OPTIONS = [
  "Pengakap Kanak-Kanak",
  "Pengakap Muda",
  "Pengakap Remaja",
  "Pengakap Kelana",
];

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

function getCategory(member?: Member | null) {
  return (
    member?.unit_pengakap ||
    member?.scout_category ||
    member?.category ||
    "Tidak Ditetapkan"
  );
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

function cleanIc(value: string) {
  const raw = String(value || "").trim().replace(/^'/, "");

  // Handle Excel scientific notation, contoh: 1.11128E+11
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(raw)) {
    const numeric = Number(raw);

    if (!Number.isNaN(numeric)) {
      return numeric.toFixed(0).replace(/\D/g, "").slice(0, 12);
    }
  }

  return raw.replace(/\D/g, "").slice(0, 12);
}

function formatIc(value: string) {
  const digits = cleanIc(value);

  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function isValidEmail(email: string) {
  if (!email) return true;
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

function normalizeHeader(value: string) {
  return String(value || "")
    .replace(/\ufeff/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuote && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuote = !insideQuote;
      continue;
    }

    if (char === delimiter && !insideQuote) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).slice(0, 10).join("\n");
  const delimiters = [",", ";", "\t"];

  let bestDelimiter = ",";
  let bestCount = 0;

  delimiters.forEach((delimiter) => {
    const escapedDelimiter = delimiter === "\t" ? "\\t" : delimiter;
    const count = (sample.match(new RegExp(escapedDelimiter, "g")) || [])
      .length;

    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  });

  return bestDelimiter;
}

function parseCsvText(text: string) {
  const delimiter = detectDelimiter(text);

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const expectedHeaders = [
    "NAMA PENUH",
    "NO. K.P.",
    "JANTINA",
    "KETURUNAN",
    "TARIKH LAHIR",
    "UNIT PENGAKAP",
    "NO. WOSM",
    "EMAIL",
  ];

  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const normalizedLine = normalizeHeader(lines[i]);

    const matchCount = expectedHeaders.filter((header) =>
      normalizedLine.includes(header)
    ).length;

    if (matchCount >= 2) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Header CSV tidak dijumpai. Sila guna template rasmi.");
  }

  const headers = splitCsvLine(lines[headerIndex], delimiter).map(
    normalizeHeader
  );

  return lines.slice(headerIndex + 1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || "";
    });

    return record;
  });
}

function getCsvValue(row: Record<string, string>, possibleHeaders: string[]) {
  for (const header of possibleHeaders) {
    const normalizedHeader = normalizeHeader(header);

    const foundKey = Object.keys(row).find((key) => {
      const normalizedKey = normalizeHeader(key);

      return (
        normalizedKey === normalizedHeader ||
        normalizedKey.includes(normalizedHeader) ||
        normalizedHeader.includes(normalizedKey)
      );
    });

    if (foundKey && row[foundKey]) {
      return row[foundKey].trim();
    }
  }

  return "";
}

function normalizeGender(value: string) {
  const text = value.trim().toLowerCase();

  if (["l", "lelaki", "male", "m"].includes(text)) return "Lelaki";
  if (["p", "perempuan", "female", "f"].includes(text)) return "Perempuan";

  return value || "Lelaki";
}

function normalizeDate(value: string) {
  const text = value.trim();

  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(text)) {
    const [day, month, year] = text.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function calculateAgeFromBirthDate(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age > 0 ? age : null;
}

function getBirthDateFromIc(icNumber: string) {
  const digits = cleanIc(icNumber);

  if (digits.length < 6) return null;

  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));

  if (!yy && yy !== 0) return null;
  if (!mm || !dd || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;

  return `${fullYear}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
    2,
    "0"
  )}`;
}

function calculateAgeFromIc(icNumber: string) {
  const birthDate = getBirthDateFromIc(icNumber);
  return calculateAgeFromBirthDate(birthDate);
}

function downloadAssistantMemberTemplate() {
  const headers = [
    "BIL",
    "NAMA PENUH (HURUF BESAR, SEPERTI DALAM K.P.)",
    "NO. K.P.",
    "JANTINA",
    "KETURUNAN",
    "TARIKH LAHIR",
    "UNIT PENGAKAP",
    "NO. WOSM",
    "EMAIL",
  ];

  const rows = [
    [
      "1",
      "ALI BIN ABU",
      "'010203101234",
      "Lelaki",
      "Melayu",
      "03/02/2010",
      "Pengakap Kanak-Kanak",
      "MY12345",
      "ali@example.com",
    ],
    [
      "2",
      "SITI BINTI AHMAD",
      "'110405105678",
      "Perempuan",
      "Melayu",
      "05/04/2011",
      "Pengakap Kanak-Kanak",
      "MY67890",
      "siti@example.com",
    ],
  ];

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
  link.download = "template-import-ahli-penolong-pemimpin.csv";
  link.click();

  URL.revokeObjectURL(url);
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
        currentUser.full_name || currentUser.name || "Penolong Pemimpin",
      actor_role: currentUser.role || "Penolong Pemimpin",
      action,
      module: "Ahli Kumpulan",
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

export default function AssistantMembersPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  const [importing, setImporting] = useState(false);

  const [form, setForm] = useState<MemberForm>({
    full_name: "",
    ic_number: "",
    email: "",
    phone: "",
    category: "Pengakap Kanak-Kanak",
    age: "",
    gender: "Lelaki",
    guardian_name: "",
    guardian_phone: "",
    address: "",
    notes: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);

    if (!groupId && !groupName) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const active = members.filter(
      (member) => normalizeStatus(member.status) === "Aktif"
    ).length;

    const inactive = members.filter(
      (member) => normalizeStatus(member.status) === "Tidak Aktif"
    ).length;

    return {
      total: members.length,
      active,
      inactive,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const numericSearch = search.replace(/\D/g, "");

    return members.filter((member) => {
      const status = normalizeStatus(member.status);
      const category = getCategory(member);

      const matchSearch =
        !keyword ||
        String(member.full_name || "").toLowerCase().includes(keyword) ||
        String(member.email || "").toLowerCase().includes(keyword) ||
        String(member.ic_number || "").includes(numericSearch) ||
        String(member.phone || "").includes(numericSearch) ||
        category.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      const matchCategory =
        categoryFilter === "Semua Kategori" || category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [members, search, statusFilter, categoryFilter]);

  function resetForm() {
    setEditingMember(null);

    setForm({
      full_name: "",
      ic_number: "",
      email: "",
      phone: "",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
      guardian_name: "",
      guardian_phone: "",
      address: "",
      notes: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    resetForm();
    setShowFormModal(true);
  }

  function openEditModal(member: Member) {
    setEditingMember(member);

    setForm({
      full_name: member.full_name || "",
      ic_number: formatIc(member.ic_number || ""),
      email: member.email || "",
      phone: formatMalaysiaPhone(member.phone || ""),
      category: getCategory(member),
      age: member.age ? String(member.age) : "",
      gender: member.gender || "Lelaki",
      guardian_name: member.guardian_name || "",
      guardian_phone: formatMalaysiaPhone(member.guardian_phone || ""),
      address: member.address || "",
      notes: member.notes || "",
      status: normalizeStatus(member.status),
    });

    setShowFormModal(true);
  }

  function openViewModal(member: Member) {
    setSelectedMember(member);
    setShowViewModal(true);
  }

  function validateForm() {
    const fullName = form.full_name.trim();
    const icNumber = cleanIc(form.ic_number);
    const email = form.email.trim();
    const phone = form.phone.trim();
    const guardianPhone = form.guardian_phone.trim();

    if (!fullName) {
      alert("Sila isi nama penuh ahli.");
      return false;
    }

    if (fullName.length < 3) {
      alert("Nama penuh mestilah sekurang-kurangnya 3 aksara.");
      return false;
    }

    if (icNumber && icNumber.length !== 12) {
      alert("No IC/MyKid mestilah 12 digit.");
      return false;
    }

    if (email && !isValidEmail(email)) {
      alert("Format email tidak sah.");
      return false;
    }

    if (phone && !isValidMalaysiaPhone(phone)) {
      alert("No telefon ahli tidak sah.");
      return false;
    }

    if (guardianPhone && !isValidMalaysiaPhone(guardianPhone)) {
      alert("No telefon penjaga tidak sah.");
      return false;
    }

    if (!groupId && !groupName) {
      alert("Akaun Penolong Pemimpin belum dipautkan dengan kumpulan.");
      return false;
    }

    if (!districtEnvironmentId) {
      alert("Akaun belum dipautkan dengan district environment.");
      return false;
    }

    return true;
  }

  async function checkDuplicateIc(icNumber: string, ignoreMemberId?: string) {
    if (!icNumber) return false;

    let query = supabase
      .from("members")
      .select("id")
      .eq("ic_number", icNumber)
      .is("deleted_at", null)
      .limit(1);

    if (ignoreMemberId) {
      query = query.neq("id", ignoreMemberId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function saveMember() {
    if (!validateForm()) return;

    setSaving(true);

    const icNumber = cleanIc(form.ic_number);
    const duplicateIc = await checkDuplicateIc(icNumber, editingMember?.id);

    if (duplicateIc) {
      alert("No IC/MyKid ini sudah digunakan oleh ahli lain.");
      setSaving(false);
      return;
    }

    const calculatedAge =
      form.age && Number(form.age) > 0 ? Number(form.age) : 0;

    const payload: any = {
      full_name: form.full_name.trim(),
      ic_number: icNumber || null,
      email: form.email.trim() || null,
      phone: normalizeMalaysiaPhone(form.phone) || null,
      category: form.category,
      scout_category: form.category,
      unit_pengakap: form.category,
      age: calculatedAge,
      gender: form.gender || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: normalizeMalaysiaPhone(form.guardian_phone) || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      district: district || null,
      district_environment_id: districtEnvironmentId,
      group_id: groupId || null,
      group_name: groupName || null,
      updated_at: new Date().toISOString(),
    };

    if (editingMember) {
      let updateQuery = supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id)
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
        `Penolong Pemimpin kemaskini ahli: ${form.full_name}`,
        editingMember.id,
        editingMember,
        payload
      );
    } else {
      const { data, error } = await supabase
        .from("members")
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
        `Penolong Pemimpin tambah ahli: ${form.full_name}`,
        data?.id || null,
        null,
        payload
      );
    }

    await fetchMembers();
    resetForm();
    setShowFormModal(false);
    setSaving(false);

    alert(
      editingMember ? "Ahli berjaya dikemaskini." : "Ahli berjaya ditambah."
    );
  }

  async function handleImportMembers(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!districtEnvironmentId) {
      alert("Akaun belum dipautkan dengan district environment.");
      return;
    }

    if (!groupId && !groupName) {
      alert("Akaun Penolong Pemimpin belum dipautkan dengan kumpulan.");
      return;
    }

    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();

      let text = new TextDecoder("utf-8").decode(buffer);

      if (text.includes("\u0000")) {
        text = new TextDecoder("utf-16").decode(buffer);
      }

      const rows = parseCsvText(text);

      if (rows.length === 0) {
        alert("Tiada data ahli dijumpai dalam fail CSV.");
        setImporting(false);
        return;
      }

      const icNumbers = rows
        .map((row) =>
          cleanIc(
            getCsvValue(row, [
              "NO. K.P.",
              "NO KP",
              "NO K.P",
              "IC",
              "IC NUMBER",
              "NO. MYKID",
            ])
          )
        )
        .filter(Boolean);

      let existingIcSet = new Set<string>();

      if (icNumbers.length > 0) {
        const { data: existingMembers, error: existingError } = await supabase
          .from("members")
          .select("ic_number")
          .in("ic_number", icNumbers)
          .is("deleted_at", null);

        if (existingError) {
          alert(existingError.message);
          setImporting(false);
          return;
        }

        existingIcSet = new Set(
          (existingMembers || [])
            .map((member) => String(member.ic_number || ""))
            .filter(Boolean)
        );
      }

      const seenIcSet = new Set<string>();
      const payloads: any[] = [];
      const skippedRows: string[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 1;

        const fullName = getCsvValue(row, [
          "NAMA PENUH (HURUF BESAR, SEPERTI DALAM K.P.)",
          "NAMA PENUH",
          "NAMA",
          "FULL NAME",
        ]).toUpperCase();

        const icNumber = cleanIc(
          getCsvValue(row, [
            "NO. K.P.",
            "NO KP",
            "NO K.P",
            "IC",
            "IC NUMBER",
          ])
        );

        const gender = normalizeGender(getCsvValue(row, ["JANTINA", "GENDER"]));

        const race =
          getCsvValue(row, ["KETURUNAN", "RACE", "KAUM"]) || null;

        const birthDateFromCsv = normalizeDate(
          getCsvValue(row, ["TARIKH LAHIR", "BIRTH DATE", "DOB"])
        );

        const birthDate = birthDateFromCsv || getBirthDateFromIc(icNumber);

        const age =
          calculateAgeFromBirthDate(birthDate) ??
          calculateAgeFromIc(icNumber) ??
          0;

        const unitPengakap =
          getCsvValue(row, [
            "UNIT PENGAKAP",
            "KATEGORI",
            "SCOUT CATEGORY",
            "CATEGORY",
          ]) || "Pengakap Kanak-Kanak";

        const wosmNo =
          getCsvValue(row, ["NO. WOSM", "NO WOSM", "WOSM", "WOSM NO"]) ||
          null;

        const email = getCsvValue(row, ["EMAIL", "E-MAIL"]) || null;

        if (!fullName) {
          skippedRows.push(`Row ${rowNumber}: Nama kosong`);
          return;
        }

        if (icNumber && icNumber.length !== 12) {
          skippedRows.push(`Row ${rowNumber}: IC tidak cukup 12 digit`);
          return;
        }

        if (email && !isValidEmail(email)) {
          skippedRows.push(`Row ${rowNumber}: Email tidak sah`);
          return;
        }

        if (icNumber && existingIcSet.has(icNumber)) {
          skippedRows.push(`Row ${rowNumber}: IC sudah wujud`);
          return;
        }

        if (icNumber && seenIcSet.has(icNumber)) {
          skippedRows.push(`Row ${rowNumber}: Duplicate IC dalam fail`);
          return;
        }

        if (icNumber) {
          seenIcSet.add(icNumber);
        }

        payloads.push({
          full_name: fullName,
          ic_number: icNumber || null,
          email,
          gender,
          race,
          birth_date: birthDate,
          unit_pengakap: unitPengakap,
          wosm_no: wosmNo,
          category: unitPengakap,
          scout_category: unitPengakap,
          age,
          status: "Aktif",
          district: district || null,
          district_environment_id: districtEnvironmentId,
          group_id: groupId || null,
          group_name: groupName || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        });
      });

      if (payloads.length === 0) {
        alert(
          `Tiada ahli berjaya diimport.\n\nSkipped:\n${skippedRows
            .slice(0, 10)
            .join("\n")}`
        );
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("members").insert(payloads);

      if (error) {
        alert(error.message);
        setImporting(false);
        return;
      }

      await addAuditLog(
        "IMPORT",
        `Penolong Pemimpin import ${payloads.length} ahli melalui CSV`,
        null,
        null,
        {
          imported: payloads.length,
          skipped: skippedRows.length,
          group_id: groupId || null,
          group_name: groupName || null,
        }
      );

      await fetchMembers();

      alert(
        `Import selesai.\n\nBerjaya: ${payloads.length}\nSkip: ${
          skippedRows.length
        }${
          skippedRows.length > 0
            ? `\n\nContoh skip:\n${skippedRows.slice(0, 10).join("\n")}`
            : ""
        }`
      );
    } catch (error: any) {
      alert(error?.message || "Gagal import CSV.");
    }

    setImporting(false);
  }

  if (!groupId && !groupName) {
    return (
      <DashboardLayout role="assistantLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pemimpin
          Kumpulan atau Pesuruhjaya Daerah untuk kemaskini kumpulan anda.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantLeader">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Kumpulan</h2>
          <p className="text-muted mb-0">
            Urus ahli untuk kumpulan <strong>{groupName || "-"}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-success" onClick={fetchMembers}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button
            className="btn btn-outline-secondary"
            onClick={downloadAssistantMemberTemplate}
          >
            <i className="bi bi-file-earmark-arrow-down me-1"></i>
            Template CSV
          </button>

          <label
            className={`btn btn-outline-primary mb-0 ${
              importing ? "disabled" : ""
            }`}
          >
            <i className="bi bi-upload me-1"></i>
            {importing ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              disabled={importing}
              onChange={handleImportMembers}
            />
          </label>

          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-person-plus me-1"></i>
            Tambah Ahli
          </button>
        </div>
      </div>

      <div className="alert alert-light border rounded-4 mb-4">
        <i className="bi bi-shield-check text-success me-2"></i>
        Penolong Pemimpin hanya boleh tambah, edit dan import ahli dalam
        kumpulan sendiri. Fungsi nyahaktif ahli dikawal oleh Pemimpin Kumpulan /
        Pesuruhjaya Daerah.
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Ahli</small>
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
              <h3 className="fw-bold text-warning mb-0">{stats.inactive}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari nama, email, IC atau telefon..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option>Semua Kategori</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
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
                  setCategoryFilter("Semua Kategori");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Ahli</th>
                <th className="px-4 py-3">IC/MyKid</th>
                <th className="px-4 py-3">Kategori</th>
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
                    <p className="text-muted mt-3 mb-0">Memuatkan ahli...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 d-block mb-2"></i>
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
                          style={{ width: 40, height: 40 }}
                        >
                          {getInitials(member.full_name)}
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {member.full_name || "-"}
                          </div>
                          <small className="text-muted">
                            {member.email || "Tiada email"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {formatIc(member.ic_number || "") || "-"}
                    </td>

                    <td className="px-4 py-3">{getCategory(member)}</td>

                    <td className="px-4 py-3">{member.age ?? "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill ${
                          normalizeStatus(member.status) === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(member.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-light border"
                          onClick={() => openViewModal(member)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye text-primary"></i>
                        </button>

                        <button
                          className="btn btn-light border"
                          onClick={() => openEditModal(member)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square text-secondary"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white p-4 small text-muted">
          Memaparkan {filteredMembers.length} daripada {members.length} rekod
        </div>
      </div>

      {showFormModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingMember ? "Edit Ahli" : "Tambah Ahli"}
                  </h5>
                  <small className="text-muted">
                    Ahli akan dipautkan kepada kumpulan {groupName || "-"}.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowFormModal(false);
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
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">IC/MyKid</label>
                    <input
                      className="form-control"
                      value={form.ic_number}
                      maxLength={14}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          ic_number: formatIc(event.target.value),
                        })
                      }
                      placeholder="010203-10-1234"
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
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(event) =>
                        setForm({ ...form, category: event.target.value })
                      }
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Umur</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      className="form-control"
                      value={form.age}
                      onChange={(event) =>
                        setForm({ ...form, age: event.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Jantina</label>
                    <select
                      className="form-select"
                      value={form.gender}
                      onChange={(event) =>
                        setForm({ ...form, gender: event.target.value })
                      }
                    >
                      {GENDER_OPTIONS.map((gender) => (
                        <option key={gender}>{gender}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nama Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_name}
                      onChange={(event) =>
                        setForm({ ...form, guardian_name: event.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_phone}
                      maxLength={13}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          guardian_phone: formatMalaysiaPhone(
                            event.target.value
                          ),
                        })
                      }
                      placeholder="012-345 6789"
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
                    <label className="form-label">Kumpulan</label>
                    <input
                      className="form-control bg-light"
                      value={groupName || "-"}
                      readOnly
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Alamat</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address}
                      onChange={(event) =>
                        setForm({ ...form, address: event.target.value })
                      }
                    ></textarea>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.notes}
                      onChange={(event) =>
                        setForm({ ...form, notes: event.target.value })
                      }
                    ></textarea>
                  </div>
                </div>

                <div className="alert alert-info rounded-4 small mt-4 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Penolong Pemimpin hanya boleh mengurus ahli dalam kumpulan
                  sendiri sahaja.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveMember}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingMember
                    ? "Kemaskini"
                    : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedMember && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Ahli</h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedMember(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                    style={{ width: 82, height: 82, fontSize: 26 }}
                  >
                    {getInitials(selectedMember.full_name)}
                  </div>

                  <h5 className="fw-bold mb-1">
                    {selectedMember.full_name || "-"}
                  </h5>

                  <small className="text-muted">
                    {getCategory(selectedMember)}
                  </small>
                </div>

                <div className="list-group list-group-flush">
                  <InfoRow
                    label="IC/MyKid"
                    value={formatIc(selectedMember.ic_number || "") || "-"}
                  />
                  <InfoRow label="Email" value={selectedMember.email || "-"} />
                  <InfoRow
                    label="Telefon"
                    value={
                      formatMalaysiaPhone(selectedMember.phone || "") || "-"
                    }
                  />
                  <InfoRow
                    label="Kumpulan"
                    value={selectedMember.group_name || "-"}
                  />
                  <InfoRow
                    label="Kategori"
                    value={getCategory(selectedMember)}
                  />
                  <InfoRow
                    label="Keturunan"
                    value={selectedMember.race || "-"}
                  />
                  <InfoRow
                    label="Tarikh Lahir"
                    value={formatDate(selectedMember.birth_date)}
                  />
                  <InfoRow
                    label="No. WOSM"
                    value={selectedMember.wosm_no || "-"}
                  />
                  <InfoRow
                    label="Umur"
                    value={
                      selectedMember.age !== null &&
                      selectedMember.age !== undefined
                        ? String(selectedMember.age)
                        : "-"
                    }
                  />
                  <InfoRow label="Jantina" value={selectedMember.gender || "-"} />
                  <InfoRow
                    label="Penjaga"
                    value={selectedMember.guardian_name || "-"}
                  />
                  <InfoRow
                    label="Telefon Penjaga"
                    value={
                      formatMalaysiaPhone(
                        selectedMember.guardian_phone || ""
                      ) || "-"
                    }
                  />
                  <InfoRow
                    label="Status"
                    value={normalizeStatus(selectedMember.status)}
                  />

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-1">Alamat</span>
                    <strong>{selectedMember.address || "-"}</strong>
                  </div>

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-1">Catatan</span>
                    <strong>{selectedMember.notes || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedMember(null);
                  }}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedMember);
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-group-item d-flex justify-content-between gap-3">
      <span className="text-muted">{label}</span>
      <strong className="text-end">{value}</strong>
    </div>
  );
}