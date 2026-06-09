import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  ic_number?: string | null;
  full_name?: string | null;
  email?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  age?: number | null;
  gender?: string | null;
  race?: string | null;
  birth_date?: string | null;
  unit_pengakap?: string | null;
  wosm_no?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type MemberForm = {
  ic_number: string;
  full_name: string;
  email: string;
  category: string;
  age: string;
  gender: string;
  race: string;
  birth_date: string;
  unit_pengakap: string;
  wosm_no: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
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

const CATEGORY_OPTIONS = [
  "Pengakap Lebah",
  "Pengakap Kanak-Kanak",
  "Pengakap Muda",
  "Pengakap Remaja",
  "Pengakap Kelana",
];

const GENDER_OPTIONS = ["Lelaki", "Perempuan"];
const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];

const RACE_OPTIONS = [
  "Melayu",
  "Cina",
  "India",
  "Bumiputera Sabah",
  "Bumiputera Sarawak",
  "Orang Asli",
  "Iban",
  "Bidayuh",
  "Kadazan-Dusun",
  "Bajau",
  "Melanau",
  "Murut",
  "Sikh",
  "Serani",
  "Siam",
  "Lain-lain",
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

function getInitials(name: string) {
  return name
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

function normalizeMalaysianIC(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function formatMalaysianIC(value?: string | null) {
  const digits = normalizeMalaysianIC(value);

  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function isValidMalaysianIC(value?: string | null) {
  const digits = normalizeMalaysianIC(value);

  if (digits.length !== 12) return false;

  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));

  if (Number.isNaN(month) || Number.isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

function displayIC(value?: string | null) {
  if (!value) return "-";
  return formatMalaysianIC(value);
}

function normalizeMalaysiaPhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatMalaysiaPhone(value?: string | null) {
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

function isValidMalaysiaPhone(value?: string | null) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits) return false;
  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function displayPhone(value?: string | null) {
  if (!value) return "-";
  return formatMalaysiaPhone(value);
}

function isValidEmail(email?: string | null) {
  const value = String(email || "").trim();

  if (!value) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getCategory(member: Member) {
  return (
    member.unit_pengakap ||
    member.scout_category ||
    member.category ||
    "Tidak Ditetapkan"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateForDB(value?: string | null) {
  if (!value) return null;

  const clean = String(value).trim();

  if (!clean) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const longYear = clean.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (longYear) {
    const day = longYear[1].padStart(2, "0");
    const month = longYear[2].padStart(2, "0");
    const year = longYear[3];

    if (Number(month) < 1 || Number(month) > 12) return null;
    if (Number(day) < 1 || Number(day) > 31) return null;

    return `${year}-${month}-${day}`;
  }

  const shortYear = clean.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/);
  if (shortYear) {
    const part1 = Number(shortYear[1]);
    const part2 = Number(shortYear[2]);
    const part3 = Number(shortYear[3]);

    if (part1 >= 1 && part1 <= 31 && part2 >= 1 && part2 <= 12) {
      const day = String(part1).padStart(2, "0");
      const month = String(part2).padStart(2, "0");
      const year = part3 <= 30 ? 2000 + part3 : 1900 + part3;

      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function calculateAgeFromBirthDate(value?: string | null) {
  const dbDate = formatDateForDB(value);

  if (!dbDate) return "";

  const birthDate = new Date(dbDate);

  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age > 0 && age <= 100 ? String(age) : "";
}

function calculateAgeFromIC(icNumber?: string | null) {
  const cleanIC = normalizeMalaysianIC(icNumber);

  if (cleanIC.length !== 12) return "";

  const yy = Number(cleanIC.slice(0, 2));
  const mm = Number(cleanIC.slice(2, 4));
  const dd = Number(cleanIC.slice(4, 6));

  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return "";
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;
  const birthYear = yy <= currentYY ? 2000 + yy : 1900 + yy;

  const birthDate = new Date(birthYear, mm - 1, dd);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age > 0 && age <= 100 ? String(age) : "";
}

function normalizeGender(value?: string | null) {
  const gender = String(value || "").trim().toLowerCase();

  if (["lelaki", "l", "male", "m"].includes(gender)) return "Lelaki";
  if (["perempuan", "p", "female", "f"].includes(gender)) return "Perempuan";

  return value || null;
}

function normalizeRace(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const found = RACE_OPTIONS.find(
    (race) => race.toLowerCase() === raw.toLowerCase()
  );

  return found || "Lain-lain";
}

async function readFileTextSmart(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }

  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  const nullCount = (utf8Text.match(/\u0000/g) || []).length;

  if (nullCount > 10) {
    return new TextDecoder("utf-16le").decode(buffer);
  }

  return utf8Text;
}

function normalizeHeader(header: string) {
  return String(header || "")
    .replace(/\u0000/g, "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/,/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function detectDelimiter(text: string) {
  const sampleLines = String(text || "")
    .split("\n")
    .slice(0, 25)
    .join("\n");

  const comma = (sampleLines.match(/,/g) || []).length;
  const semicolon = (sampleLines.match(/;/g) || []).length;
  const tab = (sampleLines.match(/\t/g) || []).length;

  if (tab >= comma && tab >= semicolon && tab > 0) return "\t";
  if (semicolon >= comma && semicolon > 0) return ";";

  return ",";
}

function isLikelyMemberHeader(headers: string[]) {
  const joined = headers.join("|");

  const hasName =
    joined.includes("namapen") ||
    joined.includes("namapenuh") ||
    joined.includes("fullname") ||
    joined.includes("namaahli") ||
    joined.includes("nama");

  const hasIC =
    joined.includes("nokp") ||
    joined.includes("noic") ||
    joined.includes("ic") ||
    joined.includes("mykid") ||
    joined.includes("kadpengenalan");

  const hasGender =
    joined.includes("jantina") ||
    joined.includes("gender") ||
    joined.includes("sex");

  return hasName && hasIC && hasGender;
}

function parseCSV(text: string) {
  let cleanText = String(text || "")
    .replace(/\u0000/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  let lines = cleanText.split("\n").filter((line) => line.trim() !== "");

  if (lines[0]?.toLowerCase().startsWith("sep=")) {
    lines = lines.slice(1);
    cleanText = lines.join("\n");
  }

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(cleanText);

  const rawRows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    const next = cleanText[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if (char === "\n" && !insideQuotes) {
      row.push(current.trim());

      if (row.some((cell) => cell.trim() !== "")) {
        rawRows.push(row);
      }

      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());

  if (row.some((cell) => cell.trim() !== "")) {
    rawRows.push(row);
  }

  if (rawRows.length < 2) return [];

  const headerIndex = rawRows.findIndex((rawRow) => {
    const normalizedHeaders = rawRow.map(normalizeHeader);
    return isLikelyMemberHeader(normalizedHeaders);
  });

  if (headerIndex === -1) {
    console.log(
      "CSV rows checked for header:",
      rawRows.map((rawRow) => rawRow.map(normalizeHeader))
    );
    return [];
  }

  const headers = rawRows[headerIndex].map(normalizeHeader);

  console.log("CSV delimiter detected:", delimiter);
  console.log("CSV header row detected:", headerIndex + 1);
  console.log("CSV headers detected:", headers);

  return rawRows.slice(headerIndex + 1).map((cells, index) => {
    const item: Record<string, string> = {};

    headers.forEach((header, cellIndex) => {
      item[header] = cells[cellIndex]?.trim() || "";
    });

    item.__rowNumber = String(headerIndex + index + 2);
    item.__raw = cells.join(" | ");

    return item;
  });
}

function getCSVValue(row: Record<string, string>, keys: string[]) {
  const rowKeys = Object.keys(row);

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);

    if (row[normalizedKey]) {
      return String(row[normalizedKey]).trim();
    }

    const fuzzyKey = rowKeys.find((rowKey) => {
      if (rowKey.startsWith("__")) return false;

      return (
        rowKey === normalizedKey ||
        rowKey.includes(normalizedKey) ||
        normalizedKey.includes(rowKey)
      );
    });

    if (fuzzyKey && row[fuzzyKey]) {
      return String(row[fuzzyKey]).trim();
    }
  }

  return "";
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name ||
        currentUser.name ||
        currentUser.email ||
        "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action,
      module: "Ahli Kumpulan",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
      record_id: recordId || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Jangan block proses utama kalau audit log gagal.
  }
}

export default function GroupMembersPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [genderFilter, setGenderFilter] = useState("Semua Jantina");

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Member | null>(null);

  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");

  const [form, setForm] = useState<MemberForm>({
    ic_number: "",
    full_name: "",
    email: "",
    category: "Pengakap Kanak-Kanak",
    age: "",
    gender: "Lelaki",
    race: "",
    birth_date: "",
    unit_pengakap: "Pengakap Kanak-Kanak",
    wosm_no: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    notes: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const male = members.filter((member) => member.gender === "Lelaki").length;
    const female = members.filter(
      (member) => member.gender === "Perempuan"
    ).length;

    return {
      total: members.length,
      active,
      inactive,
      male,
      female,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const cleanKeyword = search.replace(/\D/g, "");

    return members.filter((member) => {
      const icFormatted = formatMalaysianIC(member.ic_number || "");
      const phoneFormatted = formatMalaysiaPhone(member.guardian_phone || "");
      const category = getCategory(member);
      const status = normalizeStatus(member.status);

      const matchSearch =
        !keyword ||
        (member.full_name || "").toLowerCase().includes(keyword) ||
        (member.email || "").toLowerCase().includes(keyword) ||
        (member.guardian_email || "").toLowerCase().includes(keyword) ||
        (member.guardian_name || "").toLowerCase().includes(keyword) ||
        (member.ic_number || "").includes(cleanKeyword) ||
        icFormatted.toLowerCase().includes(keyword) ||
        (member.guardian_phone || "").includes(cleanKeyword) ||
        phoneFormatted.toLowerCase().includes(keyword) ||
        (member.wosm_no || "").toLowerCase().includes(keyword) ||
        (member.race || "").toLowerCase().includes(keyword);

      const matchCategory =
        categoryFilter === "Semua Kategori" || category === categoryFilter;

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      const matchGender =
        genderFilter === "Semua Jantina" || member.gender === genderFilter;

      return matchSearch && matchCategory && matchStatus && matchGender;
    });
  }, [members, search, categoryFilter, statusFilter, genderFilter]);

  function resetForm() {
    setEditingMember(null);

    setForm({
      ic_number: "",
      full_name: "",
      email: "",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
      race: "",
      birth_date: "",
      unit_pengakap: "Pengakap Kanak-Kanak",
      wosm_no: "",
      guardian_name: "",
      guardian_phone: "",
      guardian_email: "",
      address: "",
      notes: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    resetForm();
    setShowMemberModal(true);
  }

  function openViewModal(member: Member) {
    setSelectedMember(member);
    setShowViewModal(true);
  }

  function openEditModal(member: Member) {
    setEditingMember(member);

    setForm({
      ic_number: formatMalaysianIC(member.ic_number || ""),
      full_name: member.full_name || "",
      email: member.email || "",
      category:
        member.category ||
        member.scout_category ||
        member.unit_pengakap ||
        "Pengakap Kanak-Kanak",
      age: member.age ? String(member.age) : "",
      gender: member.gender || "Lelaki",
      race: member.race || "",
      birth_date: member.birth_date || "",
      unit_pengakap:
        member.unit_pengakap ||
        member.scout_category ||
        member.category ||
        "Pengakap Kanak-Kanak",
      wosm_no: member.wosm_no || "",
      guardian_name: member.guardian_name || "",
      guardian_phone: formatMalaysiaPhone(member.guardian_phone || ""),
      guardian_email: member.guardian_email || "",
      address: member.address || "",
      notes: member.notes || "",
      status: normalizeStatus(member.status),
    });

    setShowMemberModal(true);
  }

  function openDeactivateModal(member: Member) {
    setDeactivateTarget(member);
    setShowDeactivateModal(true);
  }

  async function checkDuplicateIC(icNumber: string, ignoreMemberId?: string) {
    const cleanIC = normalizeMalaysianIC(icNumber);

    if (!cleanIC) return false;

    let query = supabase
      .from("members")
      .select("id")
      .eq("ic_number", cleanIC)
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

  function validateForm() {
    if (!form.ic_number.trim()) {
      alert("Sila isi No IC / MyKid.");
      return false;
    }

    if (!isValidMalaysianIC(form.ic_number)) {
      alert(
        "No IC / MyKid tidak sah. Sila guna format 12 digit seperti 030101-03-1234."
      );
      return false;
    }

    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh ahli.");
      return false;
    }

    if (form.email && !isValidEmail(form.email)) {
      alert("Format e-mel ahli tidak sah.");
      return false;
    }

    if (!form.race.trim()) {
      alert("Sila pilih keturunan.");
      return false;
    }

    if (!form.age.trim()) {
      alert("Sila isi umur ahli.");
      return false;
    }

    const ageNumber = Number(form.age);

    if (Number.isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 100) {
      alert("Umur ahli tidak sah.");
      return false;
    }

    if (form.guardian_phone && !isValidMalaysiaPhone(form.guardian_phone)) {
      alert(
        "Nombor telefon penjaga tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return false;
    }

    if (form.guardian_email && !isValidEmail(form.guardian_email)) {
      alert("Format e-mel penjaga tidak sah.");
      return false;
    }

    return true;
  }

  async function saveMember() {
    if (!validateForm()) return;

    setSaving(true);

    const duplicateIC = await checkDuplicateIC(
      form.ic_number,
      editingMember?.id
    );

    if (duplicateIC) {
      alert("No IC / MyKid ini sudah wujud dalam sistem.");
      setSaving(false);
      return;
    }

    const payload = {
      ic_number: normalizeMalaysianIC(form.ic_number),
      full_name: form.full_name.trim().toUpperCase(),
      email: form.email.trim() || null,
      group_id: groupId || null,
      group_name: groupName || null,
      category: form.unit_pengakap || form.category,
      scout_category: form.unit_pengakap || form.category,
      age: Number(form.age),
      gender: form.gender,
      race: form.race.trim() || null,
      birth_date: form.birth_date || null,
      unit_pengakap: form.unit_pengakap || form.category,
      wosm_no: form.wosm_no.trim() || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: normalizeMalaysiaPhone(form.guardian_phone) || null,
      guardian_email: form.guardian_email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
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
        `Kemaskini ahli kumpulan: ${form.full_name}`,
        editingMember.id
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
        `Tambah ahli kumpulan: ${form.full_name}`,
        data?.id || null
      );
    }

    await fetchMembers();
    resetForm();
    setShowMemberModal(false);
    setSaving(false);
  }

  function downloadImportTemplateCSV() {
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

    const exampleRows = [
      [
        "1",
        "AIMAN HAKIM BIN ALI",
        "120101100001",
        "Lelaki",
        "Melayu",
        "01/01/2012",
        "Pengakap Kanak-Kanak",
        "WOSM001",
        "aiman@test.com",
      ],
      [
        "2",
        "NUR AISYAH BINTI ABU",
        "120807100010",
        "Perempuan",
        "Cina",
        "07/08/2012",
        "Pengakap Kanak-Kanak",
        "WOSM002",
        "aisyah@test.com",
      ],
    ];

    const csvContent = [headers, ...exampleRows]
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
    link.download = "template-import-ahli-pengakap.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function importCSVMembers() {
    if (!csvFile && !csvText) {
      alert("Sila pilih fail CSV.");
      return;
    }

    if (!groupId && !groupName) {
      alert("Akaun anda belum dipautkan dengan kumpulan.");
      return;
    }

    setImporting(true);

    try {
      const text = csvText || (csvFile ? await readFileTextSmart(csvFile) : "");
      const rows = parseCSV(text);

      console.log("CSV rows:", rows);

      if (rows.length === 0) {
        alert(
          "Fail CSV kosong atau format tidak sah. Sistem tidak jumpa row header NAMA / NO. K.P. / JANTINA."
        );
        setImporting(false);
        return;
      }

      const skippedRows: string[] = [];
      const warningRows: string[] = [];
      const csvICSet = new Set<string>();

      const payload = rows
        .map((row) => {
          const rowNumber = row.__rowNumber || "-";

          const rawIC = getCSVValue(row, [
            "NO. K.P.",
            "NO K.P.",
            "NO KP",
            "NO.KP",
            "NO. IC",
            "NO IC",
            "NOIC",
            "IC",
            "MYKID",
            "NO MYKID",
            "KAD PENGENALAN",
            "NRIC",
            "ic_number",
          ]);

          const fullName = getCSVValue(row, [
            "NAMA PEN",
            "NAMAPEN",
            "NAMA PENUH (HURUF BESAR, SEPERTI DALAM K.P.)",
            "NAMA PENUH HURUF BESAR SEPERTI DALAM K.P.",
            "NAMA PENUH HURUF BESAR SEPERTI DALAM KP",
            "NAMA PENUH HURUF BESAR SEPERTI DALAM K P",
            "NAMA PENUH",
            "NAMA AHLI",
            "NAMA",
            "FULL NAME",
            "FULLNAME",
            "full_name",
          ]);

          if (!fullName.trim()) {
            if (row.__raw && row.__raw.replace(/\|/g, "").trim()) {
              skippedRows.push(`Row ${rowNumber}: tiada nama`);
            }
            return null;
          }

          const cleanIC = normalizeMalaysianIC(rawIC);

          if (!cleanIC || cleanIC.length !== 12) {
            skippedRows.push(`Row ${rowNumber}: No K.P. tidak sah / kosong`);
            return null;
          }

          if (!isValidMalaysianIC(cleanIC)) {
            skippedRows.push(`Row ${rowNumber}: No K.P. tidak sah`);
            return null;
          }

          if (csvICSet.has(cleanIC)) {
            skippedRows.push(`Row ${rowNumber}: IC duplicate dalam CSV`);
            return null;
          }

          csvICSet.add(cleanIC);

          const genderRaw = getCSVValue(row, [
            "JANTINA",
            "GENDER",
            "SEX",
            "gender",
          ]);

          const raceRaw = getCSVValue(row, [
            "KETURUNAN",
            "BANGSA",
            "RACE",
            "race",
          ]);

          const birthDateRaw = getCSVValue(row, [
            "TARIKH LAHIR",
            "TARIKHLAHIR",
            "DOB",
            "DATE OF BIRTH",
            "BIRTHDATE",
            "birth_date",
          ]);

          const unitPengakap =
            getCSVValue(row, [
              "UNIT PENG",
              "UNIT PENGAKAP",
              "UNITPENGAKAP",
              "UNIT",
              "KATEGORI",
              "KATEGORI PENGAKAP",
              "SCOUT CATEGORY",
              "unit_pengakap",
            ]) || "Pengakap Kanak-Kanak";

          const wosmNo = getCSVValue(row, [
            "NO. WOS",
            "NO WOS",
            "NOWOS",
            "NO. WOSM",
            "NO WOSM",
            "NOWOSM",
            "WOSM",
            "wosm_no",
          ]);

          const email = getCSVValue(row, [
            "EMAIL",
            "EMEL",
            "E-MEL",
            "EMAIL AHLI",
            "email",
          ]);

          const guardianName = getCSVValue(row, [
            "NAMA PENJAGA",
            "PENJAGA",
            "GUARDIAN NAME",
            "guardian_name",
          ]);

          const guardianPhone = getCSVValue(row, [
            "TELEFON PENJAGA",
            "NO TELEFON",
            "NOMBOR TELEFON",
            "PHONE",
            "TEL",
            "HP",
            "guardian_phone",
          ]);

          const guardianEmail = getCSVValue(row, [
            "EMAIL PENJAGA",
            "EMEL PENJAGA",
            "GUARDIAN EMAIL",
            "guardian_email",
          ]);

          const address = getCSVValue(row, [
            "ALAMAT",
            "ADDRESS",
            "ALAMAT RUMAH",
            "address",
          ]);

          const birthDate = formatDateForDB(birthDateRaw);          

          const ageFromBirthDate = birthDateRaw
            ? calculateAgeFromBirthDate(birthDateRaw)
            : "";         

          const ageFromIC = calculateAgeFromIC(cleanIC);          

          const age = ageFromBirthDate || ageFromIC || "1";

          const gender = normalizeGender(genderRaw);
          const race = normalizeRace(raceRaw);

          if (!gender) {
            warningRows.push(
              `Row ${rowNumber}: jantina kosong / tidak dikenali`
            );
          }

          if (!raceRaw) {
            warningRows.push(`Row ${rowNumber}: keturunan kosong`);
          }

          if (email && !isValidEmail(email)) {
            warningRows.push(
              `Row ${rowNumber}: email tidak sah, disimpan kosong`
            );
          }

          if (guardianEmail && !isValidEmail(guardianEmail)) {
            warningRows.push(
              `Row ${rowNumber}: email penjaga tidak sah, disimpan kosong`
            );
          }

          const cleanGuardianPhone = normalizeMalaysiaPhone(guardianPhone);

          if (guardianPhone && !isValidMalaysiaPhone(guardianPhone)) {
            warningRows.push(
              `Row ${rowNumber}: telefon penjaga tidak sah, disimpan kosong`
            );
          }

          return {
            ic_number: cleanIC,
            full_name: fullName.trim().toUpperCase(),
            email: email && isValidEmail(email) ? email.trim() : null,

            group_id: groupId || null,
            group_name: groupName || null,

            category: unitPengakap,
            scout_category: unitPengakap,

            age: Number(age),
            gender,
            race,
            birth_date: birthDate,
            unit_pengakap: unitPengakap,
            wosm_no: wosmNo || null,

            guardian_name: guardianName || null,
            guardian_phone:
              cleanGuardianPhone && isValidMalaysiaPhone(cleanGuardianPhone)
                ? cleanGuardianPhone
                : null,
            guardian_email:
              guardianEmail && isValidEmail(guardianEmail)
                ? guardianEmail.trim()
                : null,
            address: address || null,

            notes: "Import daripada fail CSV format ahli Pengakap",
            status: "Aktif",

            district: district || null,
            district_environment_id: districtEnvironmentId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };
        })
        .filter(Boolean) as any[];

      console.log("Valid import payload:", payload);

      if (payload.length === 0) {
        alert(
          `Tiada data valid untuk diimport.\n\nSkipped: ${skippedRows.length}\n\nSila check No K.P. mesti 12 digit dan header mesti ada Nama / No. K.P. / Jantina.`
        );
        setImporting(false);
        return;
      }

      const icList = payload.map((item) => item.ic_number).filter(Boolean);

      const { data: existingICs, error: checkError } = await supabase
        .from("members")
        .select("ic_number")
        .in("ic_number", icList);

      if (checkError) {
        alert(checkError.message);
        setImporting(false);
        return;
      }

      const existingSet = new Set(
        (existingICs || []).map((item: any) => item.ic_number)
      );

      const finalPayload = payload.filter(
        (item) => !existingSet.has(item.ic_number)
      );

      if (finalPayload.length === 0) {
        alert(
          `Semua No K.P. dalam CSV sudah wujud dalam sistem.\n\n${icList
            .map(formatMalaysianIC)
            .join("\n")}`
        );
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("members").insert(finalPayload);

      if (error) {
        if (
          error.message?.includes("duplicate key") ||
          error.message?.includes("members_ic_number_unique") ||
          error.code === "23505"
        ) {
          alert(
            "Import gagal sebab masih ada IC duplicate dalam sistem. Refresh page dan cuba import semula."
          );
        } else {
          alert(error.message);
        }

        setImporting(false);
        return;
      }

      await addAuditLog(
        "IMPORT",
        `Import ${finalPayload.length} ahli kumpulan melalui CSV`,
        null
      );

      await fetchMembers();

      setCsvFile(null);
      setCsvText("");
      setShowImportModal(false);

      const summary = [
        `${finalPayload.length} ahli berjaya diimport.`,
        payload.length - finalPayload.length > 0
          ? `${payload.length - finalPayload.length} IC sudah wujud dan di-skip.`
          : "",
        skippedRows.length ? `${skippedRows.length} row invalid di-skip.` : "",
        warningRows.length
          ? `${warningRows.length} warning dibetulkan automatik.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      alert(summary);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Ralat semasa import CSV.");
    } finally {
      setImporting(false);
    }
  }

  function exportMembersCSV() {
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

    const rows = filteredMembers.map((member, index) => [
      index + 1,
      member.full_name || "",
      displayIC(member.ic_number),
      member.gender || "",
      member.race || "",
      member.birth_date || "",
      member.unit_pengakap || member.scout_category || member.category || "",
      member.wosm_no || "",
      member.email || "",
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
    link.download = `ahli-${groupName || "kumpulan"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportMembersPDF() {
    const rows = filteredMembers
      .map(
        (member, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${member.full_name || ""}</td>
            <td>${displayIC(member.ic_number)}</td>
            <td>${member.gender || ""}</td>
            <td>${member.race || ""}</td>
            <td>${member.birth_date || ""}</td>
            <td>${
              member.unit_pengakap ||
              member.scout_category ||
              member.category ||
              ""
            }</td>
            <td>${member.wosm_no || ""}</td>
            <td>${member.email || ""}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup blocked. Sila allow popup untuk export PDF.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Senarai Ahli ${groupName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
            }

            h2 {
              margin-bottom: 4px;
            }

            p {
              margin-top: 0;
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th {
              background: #dc3545;
              color: white;
              border: 1px solid #333;
              padding: 6px;
              text-align: left;
            }

            td {
              border: 1px solid #333;
              padding: 6px;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 12mm;
              }
            }
          </style>
        </head>

        <body>
          <h2>Senarai Ahli Pengakap</h2>
          <p>Kumpulan: ${groupName || "-"} | Daerah: ${district || "-"}</p>

          <table>
            <thead>
              <tr>
                <th>BIL</th>
                <th>NAMA PENUH</th>
                <th>NO. K.P.</th>
                <th>JANTINA</th>
                <th>KETURUNAN</th>
                <th>TARIKH LAHIR</th>
                <th>UNIT PENGAKAP</th>
                <th>NO. WOSM</th>
                <th>EMAIL</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  async function deactivateMember() {
    if (!deactivateTarget) return;

    setSaving(true);

    let deactivateQuery = supabase
      .from("members")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deactivateTarget.id)
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (groupId) {
      deactivateQuery = deactivateQuery.eq("group_id", groupId);
    } else {
      deactivateQuery = deactivateQuery.eq("group_name", groupName);
    }

    const { error } = await deactivateQuery;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      `Nyahaktif ahli kumpulan: ${deactivateTarget.full_name}`,
      deactivateTarget.id
    );

    await fetchMembers();
    setShowDeactivateModal(false);
    setDeactivateTarget(null);
    setSaving(false);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Kumpulan</h2>
          <p className="text-muted mb-0">
            Urus ahli untuk kumpulan <strong>{groupName || "-"}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap align-items-center">
          <div className="dropdown">
            <button
              className="btn btn-outline-secondary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-arrow-down-up me-1"></i>
              Import / Export
            </button>

            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => setShowImportModal(true)}
                >
                  <i className="bi bi-upload me-2 text-success"></i>
                  Import CSV
                </button>
              </li>

              <li>
                <button
                  className="dropdown-item"
                  onClick={downloadImportTemplateCSV}
                >
                  <i className="bi bi-download me-2 text-primary"></i>
                  Download Template CSV
                </button>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button className="dropdown-item" onClick={exportMembersCSV}>
                  <i className="bi bi-file-earmark-spreadsheet me-2 text-success"></i>
                  Export CSV
                </button>
              </li>

              <li>
                <button className="dropdown-item" onClick={exportMembersPDF}>
                  <i className="bi bi-file-earmark-pdf me-2 text-danger"></i>
                  Export PDF
                </button>
              </li>
            </ul>
          </div>

          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-person-plus me-1"></i>
            Tambah Ahli
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Ahli</small>
              <h4 className="fw-bold mb-0">{stats.total}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h4 className="fw-bold text-success mb-0">{stats.active}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Aktif</small>
              <h4 className="fw-bold text-secondary mb-0">{stats.inactive}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">L / P</small>
              <h4 className="fw-bold mb-0">
                {stats.male} / {stats.female}
              </h4>
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
                  placeholder="Cari nama, IC, email, WOSM, keturunan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option>Semua Jantina</option>
                {GENDER_OPTIONS.map((gender) => (
                  <option key={gender}>{gender}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("Semua Kategori");
                  setGenderFilter("Semua Jantina");
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
                <th className="px-4 py-3">Nama Ahli</th>
                <th className="px-4 py-3">IC / MyKid</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Jantina</th>
                <th className="px-4 py-3">Keturunan</th>
                <th className="px-4 py-3">WOSM</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan ahli...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai untuk kumpulan ini.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 40, height: 40 }}
                        >
                          {getInitials(member.full_name || "-")}
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {member.full_name || "-"}
                          </div>
                          <small className="text-muted">
                            {member.email || "-"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {displayIC(member.ic_number)}
                    </td>
                    <td className="px-4 py-3">{getCategory(member)}</td>
                    <td className="px-4 py-3">{member.gender || "-"}</td>
                    <td className="px-4 py-3">{member.race || "-"}</td>
                    <td className="px-4 py-3">{member.wosm_no || "-"}</td>

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
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-light border"
                          onClick={() => openViewModal(member)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye text-primary"></i>
                        </button>

                        <button
                          className="btn btn-sm btn-light border"
                          onClick={() => openEditModal(member)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square text-secondary"></i>
                        </button>

                        {normalizeStatus(member.status) === "Aktif" && (
                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => openDeactivateModal(member)}
                            title="Nyahaktif"
                          >
                            <i className="bi bi-person-dash text-danger"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImportModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Import Ahli CSV</h5>
                  <small className="text-muted">
                    Import format rasmi ahli untuk kumpulan {groupName || "-"}.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                    setCsvText("");
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <div className="alert alert-info rounded-4 small">
                  <strong>Format header CSV yang disokong:</strong>
                  <br />
                  <code>
                    BIL,NAMA PENUH (HURUF BESAR, SEPERTI DALAM K.P.),NO.
                    K.P.,JANTINA,KETURUNAN,TARIKH LAHIR,UNIT PENGAKAP,NO.
                    WOSM,EMAIL
                  </code>
                  <div className="mt-2 text-muted">
                    Sistem juga boleh detect header daripada borang rasmi
                    walaupun header berada di tengah fail.
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <label className="form-label mb-0">Pilih Fail CSV</label>
                    <div className="small text-muted">
                      Download template, isi data, kemudian upload semula.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={downloadImportTemplateCSV}
                  >
                    <i className="bi bi-download me-1"></i>
                    Download Template
                  </button>
                </div>

                <input
                  type="file"
                  className="form-control"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] || null;

                    setCsvFile(file);

                    if (!file) {
                      setCsvText("");
                      return;
                    }

                    try {
                      const text = await readFileTextSmart(file);
                      setCsvText(text);
                    } catch (error: any) {
                      console.error(error);
                      setCsvText("");
                      alert(
                        "Gagal membaca fail. Sila cuba pilih fail CSV semula."
                      );
                    }
                  }}
                />

                {csvFile && (
                  <div className="small text-muted mt-2">
                    Fail dipilih: <strong>{csvFile.name}</strong>
                  </div>
                )}

                <hr />

                <div className="small text-muted">
                  <div>Contoh data:</div>
                  <code>
                    1,AIMAN HAKIM BIN ALI,120101100001,Lelaki,Melayu,01/01/2012,Pengakap
                    Kanak-Kanak,WOSM001,aiman@test.com
                  </code>
                </div>

                <div className="alert alert-warning rounded-4 small mt-3 mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Untuk fail Excel rasmi .xlsx, sila Save As / Download as CSV
                  dahulu sebelum upload.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  disabled={importing}
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                    setCsvText("");
                  }}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  disabled={importing || !csvFile || !csvText}
                  onClick={importCSVMembers}
                >
                  {importing ? "Mengimport..." : "Import Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
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
                    setShowMemberModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                      <div className="card-body p-4">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-person-vcard text-success me-2"></i>
                          Maklumat Ahli
                        </h6>

                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">
                              No IC / MyKid
                            </label>
                            <input
                              className="form-control"
                              value={form.ic_number}
                              maxLength={14}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  ic_number: formatMalaysianIC(e.target.value),
                                })
                              }
                              placeholder="030101-03-1234"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Nama Penuh</label>
                            <input
                              className="form-control"
                              value={form.full_name}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  full_name: e.target.value,
                                })
                              }
                              placeholder="Nama penuh ahli"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Email</label>
                            <input
                              type="email"
                              className="form-control"
                              value={form.email}
                              onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                              }
                              placeholder="email@example.com"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Kumpulan</label>
                            <input
                              className="form-control"
                              value={groupName || "-"}
                              readOnly
                            />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Unit Pengakap</label>
                            <select
                              className="form-select"
                              value={form.unit_pengakap}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  unit_pengakap: e.target.value,
                                  category: e.target.value,
                                })
                              }
                            >
                              {CATEGORY_OPTIONS.map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Umur</label>
                            <input
                              type="number"
                              className="form-control"
                              value={form.age}
                              onChange={(e) =>
                                setForm({ ...form, age: e.target.value })
                              }
                              placeholder="12"
                            />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Jantina</label>
                            <select
                              className="form-select"
                              value={form.gender}
                              onChange={(e) =>
                                setForm({ ...form, gender: e.target.value })
                              }
                            >
                              {GENDER_OPTIONS.map((gender) => (
                                <option key={gender}>{gender}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Keturunan</label>
                            <select
                              className="form-select"
                              value={form.race}
                              onChange={(e) =>
                                setForm({ ...form, race: e.target.value })
                              }
                            >
                              <option value="">Pilih Keturunan</option>
                              {RACE_OPTIONS.map((race) => (
                                <option key={race} value={race}>
                                  {race}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Tarikh Lahir</label>
                            <input
                              type="date"
                              className="form-control"
                              value={form.birth_date}
                              onChange={(e) => {
                                const birthDate = e.target.value;
                                setForm({
                                  ...form,
                                  birth_date: birthDate,
                                  age: calculateAgeFromBirthDate(birthDate),
                                });
                              }}
                            />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">No. WOSM</label>
                            <input
                              className="form-control"
                              value={form.wosm_no}
                              onChange={(e) =>
                                setForm({ ...form, wosm_no: e.target.value })
                              }
                              placeholder="WOSM001"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Status</label>
                            <select
                              className="form-select"
                              value={form.status}
                              onChange={(e) =>
                                setForm({ ...form, status: e.target.value })
                              }
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card border-0 shadow-sm rounded-4">
                      <div className="card-body p-4">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-person-lines-fill text-success me-2"></i>
                          Maklumat Penjaga
                        </h6>

                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">Nama Penjaga</label>
                            <input
                              className="form-control"
                              value={form.guardian_name}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  guardian_name: e.target.value,
                                })
                              }
                              placeholder="Nama penjaga"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">
                              Telefon Penjaga
                            </label>
                            <input
                              className="form-control"
                              value={form.guardian_phone}
                              maxLength={13}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  guardian_phone: formatMalaysiaPhone(
                                    e.target.value
                                  ),
                                })
                              }
                              placeholder="012-345 6789"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Email Penjaga</label>
                            <input
                              type="email"
                              className="form-control"
                              value={form.guardian_email}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  guardian_email: e.target.value,
                                })
                              }
                              placeholder="penjaga@example.com"
                            />
                          </div>

                          <div className="col-md-12">
                            <label className="form-label">Alamat</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={form.address}
                              onChange={(e) =>
                                setForm({ ...form, address: e.target.value })
                              }
                            ></textarea>
                          </div>

                          <div className="col-md-12">
                            <label className="form-label">Catatan</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={form.notes}
                              onChange={(e) =>
                                setForm({ ...form, notes: e.target.value })
                              }
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4">
                      <div className="card-body text-center p-4">
                        <div
                          className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                          style={{ width: 82, height: 82, fontSize: 26 }}
                        >
                          {getInitials(form.full_name || "AP")}
                        </div>

                        <h6 className="fw-bold mb-1">
                          {form.full_name || "Nama Ahli"}
                        </h6>

                        <small className="text-muted d-block">
                          {form.ic_number || "No IC / MyKid"}
                        </small>

                        <span className="badge rounded-pill bg-success mt-3">
                          {form.status}
                        </span>

                        <hr />

                        <div className="text-start">
                          <div className="mb-3">
                            <small className="text-muted d-block">
                              Kumpulan
                            </small>
                            <strong>{groupName || "-"}</strong>
                          </div>

                          <div className="mb-3">
                            <small className="text-muted d-block">Unit</small>
                            <strong>{form.unit_pengakap || "-"}</strong>
                          </div>

                          <div className="mb-3">
                            <small className="text-muted d-block">
                              No. WOSM
                            </small>
                            <strong>{form.wosm_no || "-"}</strong>
                          </div>

                          <div>
                            <small className="text-muted d-block">
                              Keturunan
                            </small>
                            <strong>{form.race || "-"}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-info rounded-4 mt-3 small">
                      <i className="bi bi-info-circle me-2"></i>
                      Format import/export mengikuti template ahli Pengakap.
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowMemberModal(false);
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
                    ? "Kemaskini Ahli"
                    : "Simpan Ahli"}
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
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-2"
                    style={{ width: 72, height: 72, fontSize: 24 }}
                  >
                    {getInitials(selectedMember.full_name || "-")}
                  </div>

                  <h5 className="fw-bold mb-0">
                    {selectedMember.full_name || "-"}
                  </h5>

                  <small className="text-muted">
                    {displayIC(selectedMember.ic_number)}
                  </small>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Kumpulan</small>
                      <strong>{selectedMember.group_name || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">
                        Unit Pengakap
                      </small>
                      <strong>{getCategory(selectedMember)}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">No. WOSM</small>
                      <strong>{selectedMember.wosm_no || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Keturunan</small>
                      <strong>{selectedMember.race || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Tarikh Lahir</small>
                      <strong>{formatDate(selectedMember.birth_date)}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Umur</small>
                      <strong>{selectedMember.age || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Jantina</small>
                      <strong>{selectedMember.gender || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Status</small>
                      <strong>
                        {normalizeStatus(selectedMember.status)}
                      </strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Penjaga</small>
                      <strong>{selectedMember.guardian_name || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">
                        Telefon Penjaga
                      </small>
                      <strong>
                        {displayPhone(selectedMember.guardian_phone)}
                      </strong>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="border rounded-4 p-3">
                      <small className="text-muted d-block">Alamat</small>
                      <strong>{selectedMember.address || "-"}</strong>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="border rounded-4 p-3">
                      <small className="text-muted d-block">Catatan</small>
                      <strong>{selectedMember.notes || "-"}</strong>
                    </div>
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

                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedMember);
                  }}
                >
                  Edit Ahli
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
                  Nyahaktif Ahli
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
                  Adakah anda pasti mahu nyahaktif ahli ini?
                </p>

                <strong>{deactivateTarget.full_name || "-"}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Ahli tidak dipadam kekal. Status hanya ditukar kepada Tidak
                  Aktif.
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
                  onClick={deactivateMember}
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