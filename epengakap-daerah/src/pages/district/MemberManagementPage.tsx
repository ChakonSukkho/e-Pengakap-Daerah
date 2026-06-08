import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  ic_number: string | null;
  full_name: string;
  email: string | null;
  group_id: string | null;
  group_name: string | null;
  category: string | null;
  scout_category: string | null;
  age: number | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  district: string | null;
  district_environment_id: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
};

type MemberForm = {
  ic_number: string;
  full_name: string;
  email: string;
  group_id: string;
  group_name: string;
  category: string;
  age: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  address: string;
  notes: string;
  status: string;
};

const CATEGORY_OPTIONS = [
  "Pengakap Kanak-Kanak",
  "Pengakap Muda",
  "Pengakap Remaja",
  "Pengakap Kelana",
];

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];
const GENDER_OPTIONS = ["Lelaki", "Perempuan"];

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

  if (
    value === "inactive" ||
    value === "tidak aktif" ||
    value === "suspended" ||
    value === "digantung"
  ) {
    return "Tidak Aktif";
  }

  return status || "Aktif";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
}

function normalizeMalaysianIC(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function formatMalaysianIC(value?: string | null) {
  const digits = normalizeMalaysianIC(value);

  if (!digits) return "";
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function isValidMalaysianIC(value?: string | null) {
  const digits = normalizeMalaysianIC(value);

  if (!digits) return false;
  if (digits.length !== 12) return false;

  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));

  if (Number.isNaN(month) || Number.isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

function displayMalaysianIC(value?: string | null) {
  if (!value) return "-";
  return formatMalaysianIC(value);
}

function normalizeMalaysianPhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatMalaysianPhone(value?: string | null) {
  const digits = normalizeMalaysianPhone(value);

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

function isValidMalaysianPhone(value?: string | null) {
  const digits = normalizeMalaysianPhone(value);

  if (!digits) return false;
  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function displayMalaysianPhone(value?: string | null) {
  if (!value) return "-";
  return formatMalaysianPhone(value);
}

function isValidEmail(email?: string | null) {
  const value = String(email || "").trim();

  if (!value) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function normalizeHeader(value: string) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function detectDelimiter(firstLine: string) {
  const comma = (firstLine.match(/,/g) || []).length;
  const semicolon = (firstLine.match(/;/g) || []).length;
  const tab = (firstLine.match(/\t/g) || []).length;

  if (tab >= comma && tab >= semicolon && tab > 0) return "\t";
  if (semicolon >= comma && semicolon > 0) return ";";

  return ",";
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

  const firstLine = lines[0] || "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
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
        rows.push(row);
      }

      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());

  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  console.log("CSV headers detected:", headers);

  return rows.slice(1).map((cells, index) => {
    const item: Record<string, string> = {};

    headers.forEach((header, cellIndex) => {
      item[header] = cells[cellIndex]?.trim() || "";
    });

    item.__rowNumber = String(index + 2);
    item.__raw = cells.join(" | ");

    return item;
  });
}

function getCSVValue(row: Record<string, string>, keys: string[]) {
  const rowKeys = Object.keys(row);

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);

    if (row[normalizedKey]) {
      return row[normalizedKey];
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
      return row[fuzzyKey];
    }
  }

  return "";
}

function normalizeGenderValue(value: string, fallback = "Lelaki") {
  const gender = value.trim().toLowerCase();

  if (["lelaki", "male", "l", "m"].includes(gender)) return "Lelaki";
  if (["perempuan", "female", "p", "f"].includes(gender)) return "Perempuan";

  return fallback;
}

function estimateAgeFromIC(icNumber: string) {
  const cleanIC = normalizeMalaysianIC(icNumber);

  if (cleanIC.length !== 12) return null;

  const yy = Number(cleanIC.slice(0, 2));
  const mm = Number(cleanIC.slice(2, 4));
  const dd = Number(cleanIC.slice(4, 6));

  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;
  const birthYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const age = currentYear - birthYear;

  if (age < 0 || age > 100) return null;

  return age;
}

function estimateAgeFromBirthDate(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const cleaned = raw.replace(/[./]/g, "-");
  const parts = cleaned.split("-").map((part) => part.trim());

  if (parts.length < 3) return null;

  let day = Number(parts[0]);
  let month = Number(parts[1]);
  let year = Number(parts[2]);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  if (year < 100) {
    const currentYear = new Date().getFullYear();
    const currentYY = currentYear % 100;
    year = year <= currentYY ? 2000 + year : 1900 + year;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - year;

  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) age -= 1;

  if (age < 0 || age > 100) return null;

  return age;
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || currentUser.name || "Unknown User",
      actor_role: currentUser.role || "Unknown Role",
      action,
      module: "Ahli Pengakap",
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

export default function MemberManagementPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importDefaultGroupId, setImportDefaultGroupId] = useState("");
  const [importDefaultCategory, setImportDefaultCategory] = useState(
    "Pengakap Kanak-Kanak"
  );
  const [importDefaultGender, setImportDefaultGender] = useState("Lelaki");
  const [importDefaultStatus, setImportDefaultStatus] = useState("Aktif");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [genderFilter, setGenderFilter] = useState("Semua Jantina");
  const [phoneFilter, setPhoneFilter] = useState("");

  const [form, setForm] = useState<MemberForm>({
    ic_number: "",
    full_name: "",
    email: "",
    group_id: "",
    group_name: "",
    category: "Pengakap Kanak-Kanak",
    age: "",
    gender: "Lelaki",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    notes: "",
    status: "Aktif",
  });

  const currentUser = useMemo(() => getCurrentUser(), []);
  const districtEnvironmentId = currentUser.district_environment_id || null;
  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchMembers();
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (district) {
      return query.eq("district", district);
    }

    return query;
  }

  async function fetchMembers() {
    setLoading(true);

    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers((data || []) as Member[]);
    setLoading(false);
  }

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, status, district, district_environment_id"
      )
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      return;
    }

    const activeGroups = (data || []).filter(
      (group: ScoutGroup) => normalizeStatus(group.status) === "Aktif"
    );

    setGroups(activeGroups as ScoutGroup[]);

    if (!importDefaultGroupId && activeGroups.length > 0) {
      setImportDefaultGroupId(activeGroups[0].id);
    }
  }

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const cleanKeyword = search.replace(/\D/g, "");
    const cleanPhoneFilter = phoneFilter.replace(/\D/g, "");

    return members.filter((member) => {
      const memberStatus = normalizeStatus(member.status);
      const memberCategory = member.category || member.scout_category || "";
      const formattedIC = formatMalaysianIC(member.ic_number || "");
      const formattedPhone = formatMalaysianPhone(member.guardian_phone || "");

      const matchSearch =
        !keyword ||
        (member.full_name || "").toLowerCase().includes(keyword) ||
        (member.email || "").toLowerCase().includes(keyword) ||
        (member.guardian_email || "").toLowerCase().includes(keyword) ||
        (member.group_name || "").toLowerCase().includes(keyword) ||
        (member.ic_number || "").includes(cleanKeyword) ||
        formattedIC.toLowerCase().includes(keyword) ||
        (member.guardian_phone || "").includes(cleanKeyword) ||
        formattedPhone.toLowerCase().includes(keyword);

      const matchPhone =
        !cleanPhoneFilter ||
        (member.guardian_phone || "").includes(cleanPhoneFilter) ||
        formattedPhone.replace(/\D/g, "").includes(cleanPhoneFilter);

      const matchGroup =
        groupFilter === "Semua Kumpulan" || member.group_name === groupFilter;

      const matchCategory =
        categoryFilter === "Semua Kategori" ||
        memberCategory === categoryFilter;

      const matchStatus =
        statusFilter === "Semua Status" || memberStatus === statusFilter;

      const matchGender =
        genderFilter === "Semua Jantina" || member.gender === genderFilter;

      return (
        matchSearch &&
        matchPhone &&
        matchGroup &&
        matchCategory &&
        matchStatus &&
        matchGender
      );
    });
  }, [
    members,
    search,
    phoneFilter,
    groupFilter,
    categoryFilter,
    statusFilter,
    genderFilter,
  ]);

  function resetForm() {
    setEditingMember(null);

    setForm({
      ic_number: "",
      full_name: "",
      email: "",
      group_id: "",
      group_name: "",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
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
      group_id: member.group_id || "",
      group_name: member.group_name || "",
      category:
        member.category || member.scout_category || "Pengakap Kanak-Kanak",
      age: member.age ? String(member.age) : "",
      gender: member.gender || "Lelaki",
      guardian_name: member.guardian_name || "",
      guardian_phone: formatMalaysianPhone(member.guardian_phone || ""),
      guardian_email: member.guardian_email || "",
      address: member.address || "",
      notes: member.notes || "",
      status: normalizeStatus(member.status),
    });

    setShowMemberModal(true);
  }

  function openDeleteModal(member: Member) {
    setDeleteTarget(member);
    setShowDeleteModal(true);
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

    query = applyDistrictScope(query);

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
    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh ahli.");
      return false;
    }

    if (form.ic_number.trim() && !isValidMalaysianIC(form.ic_number)) {
      alert("No IC / MyKid tidak sah. Contoh: 030101-03-1234.");
      return false;
    }

    if (form.email && !isValidEmail(form.email)) {
      alert("Format e-mel ahli tidak sah.");
      return false;
    }

    if (!form.group_id) {
      alert("Sila pilih kumpulan.");
      return false;
    }

    const ageNumber = Number(form.age);

    if (
      form.age &&
      (Number.isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 100)
    ) {
      alert("Umur tidak sah.");
      return false;
    }

    if (
      form.guardian_phone.trim() &&
      !isValidMalaysianPhone(form.guardian_phone)
    ) {
      alert("Nombor telefon penjaga tidak sah. Contoh: 012-345 6789.");
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

    const cleanIC = normalizeMalaysianIC(form.ic_number);

    if (cleanIC) {
      const isDuplicateIC = await checkDuplicateIC(cleanIC, editingMember?.id);

      if (isDuplicateIC) {
        alert("No IC / MyKid ini sudah wujud dalam daerah ini.");
        setSaving(false);
        return;
      }
    }

    const selectedGroup = groups.find((group) => group.id === form.group_id);

    const payload = {
      ic_number: cleanIC || null,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      group_id: form.group_id,
      group_name: selectedGroup?.group_name || form.group_name,
      category: form.category,
      scout_category: form.category,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: normalizeMalaysianPhone(form.guardian_phone) || null,
      guardian_email: form.guardian_email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
      updated_at: new Date().toISOString(),
    };

    if (editingMember) {
      let query = supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini ahli Pengakap: ${form.full_name}`,
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
        `Tambah ahli Pengakap: ${form.full_name}`,
        data?.id || null
      );
    }

    await fetchMembers();
    resetForm();
    setShowMemberModal(false);
    setSaving(false);
  }

  async function deactivateMember() {
    if (!deleteTarget) return;

    setSaving(true);

    let query = supabase
      .from("members")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id)
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      `Nyahaktif ahli Pengakap: ${deleteTarget.full_name}`,
      deleteTarget.id
    );

    await fetchMembers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setImportFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".csv") && !fileName.endsWith(".txt")) {
      alert("Sila guna fail CSV sahaja. Excel boleh Save As CSV dahulu.");
      event.target.value = "";
      setImportFile(null);
      return;
    }

    setImportFile(file);
  }

  function findGroupByName(groupName: string) {
    const keyword = groupName.trim().toLowerCase();

    if (!keyword) return null;

    return (
      groups.find((group) => {
        const groupNameDb = group.group_name.toLowerCase();
        const schoolNameDb = (group.school_name || "").toLowerCase();

        return (
          groupNameDb === keyword ||
          schoolNameDb === keyword ||
          groupNameDb.includes(keyword) ||
          keyword.includes(groupNameDb)
        );
      }) || null
    );
  }

  function getFallbackGroup() {
    if (importDefaultGroupId) {
      return groups.find((group) => group.id === importDefaultGroupId) || null;
    }

    return groups[0] || null;
  }

  async function importMembersFromCSV() {
    if (!importFile) {
      alert("Sila pilih fail dahulu.");
      return;
    }

    if (groups.length === 0) {
      alert("Tiada kumpulan aktif. Sila tambah kumpulan dahulu.");
      return;
    }

    setImporting(true);

    try {
      const text = await readFileTextSmart(importFile);
      const rows = parseCSV(text);

      if (rows.length === 0) {
        alert("Fail CSV kosong atau tiada data untuk diimport.");
        setImporting(false);
        return;
      }

      const fallbackGroup = getFallbackGroup();

      const skippedRows: string[] = [];
      const warningRows: string[] = [];
      const icSet = new Set<string>();

      const preparedRows = rows
        .map((row) => {
          const rowNumber = row.__rowNumber || "-";

          const rawIC = getCSVValue(row, [
            "ic_number",
            "ic",
            "no_ic",
            "no ic",
            "no. k.p.",
            "no k.p.",
            "nokp",
            "kp",
            "nok.p",
            "kad pengenalan",
            "nric",
            "mykid",
            "no mykid",
          ]);

          const fullName = getCSVValue(row, [
            "full_name",
            "nama",
            "nama penuh",
            "nama pen",
            "namapen",
            "nama pengakap",
            "nama peserta",
            "nama ahli",
            "name",
            "member_name",
            "murid",
            "pelajar",
          ]);

          if (!fullName.trim()) {
            skippedRows.push(`Row ${rowNumber}: tiada nama`);
            return null;
          }

          const email = getCSVValue(row, [
            "email",
            "emel",
            "e-mel",
            "email ahli",
          ]);

          const groupName = getCSVValue(row, [
            "group_name",
            "kumpulan",
            "nama kumpulan",
            "unit peng",
            "unitpeng",
            "unit pengakap",
            "unit",
            "sekolah",
            "group",
          ]);

          const category =
            getCSVValue(row, [
              "category",
              "scout_category",
              "kategori",
              "kategori pengakap",
              "unit peng",
              "unitpeng",
              "unit pengakap",
            ]) || importDefaultCategory;

          const birthDateRaw = getCSVValue(row, [
            "tarikh lahir",
            "tarikhla",
            "tarikh la",
            "dob",
            "date of birth",
            "birthdate",
          ]);

          const ageRaw = getCSVValue(row, ["age", "umur"]);
          const genderRaw = getCSVValue(row, ["gender", "jantina", "sex"]);

          const ethnicity = getCSVValue(row, [
            "keturunan",
            "bangsa",
            "race",
          ]);

          const wosNo = getCSVValue(row, [
            "no. wos",
            "no wos",
            "nowos",
            "wos",
          ]);

          const guardianName = getCSVValue(row, [
            "guardian_name",
            "penjaga",
            "nama penjaga",
            "nama ibu bapa",
            "parent name",
            "waris",
          ]);

          const guardianPhone = getCSVValue(row, [
            "guardian_phone",
            "telefon penjaga",
            "phone",
            "telefon",
            "no telefon",
            "no_tel",
            "nombor telefon",
            "hp",
            "tel",
          ]);

          const guardianEmail = getCSVValue(row, [
            "guardian_email",
            "email penjaga",
            "emel penjaga",
            "parent email",
          ]);

          const address = getCSVValue(row, [
            "address",
            "alamat",
            "alamat rumah",
          ]);

          const notesRaw = getCSVValue(row, [
            "notes",
            "catatan",
            "remark",
            "remarks",
          ]);

          const statusRaw =
            getCSVValue(row, ["status", "status ahli"]) || importDefaultStatus;

          const cleanIC = normalizeMalaysianIC(rawIC);
          const validIC = isValidMalaysianIC(cleanIC);

          const selectedGroup = groupName
            ? findGroupByName(groupName) || fallbackGroup
            : fallbackGroup;

          const estimatedAgeFromIC = validIC ? estimateAgeFromIC(cleanIC) : null;
          const estimatedAgeFromBirthDate =
            estimateAgeFromBirthDate(birthDateRaw);

          const ageNumber = ageRaw
            ? Number(ageRaw)
            : estimatedAgeFromBirthDate || estimatedAgeFromIC;

          const cleanPhone = normalizeMalaysianPhone(guardianPhone);
          const validPhone = isValidMalaysianPhone(cleanPhone);

          const gender = normalizeGenderValue(genderRaw, importDefaultGender);

          if (cleanIC && validIC) {
            if (icSet.has(cleanIC)) {
              skippedRows.push(`Row ${rowNumber}: IC duplicate dalam CSV`);
              return null;
            }

            icSet.add(cleanIC);
          }

          if (cleanIC && !validIC) {
            warningRows.push(`Row ${rowNumber}: IC tidak sah, disimpan kosong`);
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

          if (guardianPhone && !validPhone) {
            warningRows.push(
              `Row ${rowNumber}: telefon tidak sah, disimpan kosong`
            );
          }

          const extraNotes = [
            wosNo ? `No WOS: ${wosNo}` : "",
            ethnicity ? `Keturunan: ${ethnicity}` : "",
            birthDateRaw ? `Tarikh Lahir: ${birthDateRaw}` : "",
            notesRaw ? notesRaw : "",
          ]
            .filter(Boolean)
            .join(" | ");

          return {
            ic_number: cleanIC && validIC ? cleanIC : null,
            full_name: fullName.trim(),
            email: email && isValidEmail(email) ? email.trim() : null,
            group_id: selectedGroup?.id || null,
            group_name: selectedGroup?.group_name || groupName.trim() || null,
            category,
            scout_category: category,
            age:
              ageNumber && !Number.isNaN(ageNumber) && ageNumber > 0
                ? ageNumber
                : null,
            gender,
            guardian_name: guardianName.trim() || null,
            guardian_phone: cleanPhone && validPhone ? cleanPhone : null,
            guardian_email:
              guardianEmail && isValidEmail(guardianEmail)
                ? guardianEmail.trim()
                : null,
            address: address.trim() || null,
            notes: extraNotes || null,
            status: normalizeStatus(statusRaw),
            district: district || null,
            district_environment_id: districtEnvironmentId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };
        })
        .filter(Boolean) as any[];

      if (preparedRows.length === 0) {
        console.log("Skipped rows:", skippedRows);
        alert(
          `Tiada row yang boleh diimport.\n\nSkipped: ${skippedRows.length}\n\nSila buka Console dan tengok "CSV headers detected".`
        );
        setImporting(false);
        return;
      }

      const icList = preparedRows
        .map((row) => row.ic_number)
        .filter(Boolean) as string[];

      let duplicateICs: string[] = [];

      if (icList.length > 0) {
        const { data: duplicateData, error: duplicateError } = await supabase
          .from("members")
          .select("ic_number, full_name, district, group_name, deleted_at")
          .in("ic_number", icList);

        if (duplicateError) {
          alert(duplicateError.message);
          setImporting(false);
          return;
        }

        duplicateICs = (duplicateData || [])
          .map((item: any) => item.ic_number)
          .filter(Boolean);
      }

      const finalRows = preparedRows.filter((row) => {
        if (!row.ic_number) return true;
        return !duplicateICs.includes(row.ic_number);
      });

      if (finalRows.length === 0) {
        alert(
          `Semua data sudah wujud / duplicate.\n\nDuplicate IC:\n${duplicateICs
            .map(formatMalaysianIC)
            .join("\n")}`
        );
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("members").insert(finalRows);

      if (error) {
        if (
          error.message?.includes("duplicate key") ||
          error.message?.includes("members_ic_number_unique") ||
          error.code === "23505"
        ) {
          alert(
            "Import gagal sebab masih ada IC duplicate dalam sistem. Cuba refresh page dan import semula, atau semak IC dalam database."
          );
        } else {
          alert(error.message);
        }

        setImporting(false);
        return;
      }

      await addAuditLog(
        "IMPORT",
        `Import ${finalRows.length} ahli Pengakap melalui CSV`,
        null
      );

      const summary = [
        `${finalRows.length} ahli berjaya diimport.`,
        duplicateICs.length
          ? `${duplicateICs.length} IC sudah wujud dan telah di-skip.`
          : "",
        skippedRows.length ? `${skippedRows.length} row kosong/invalid di-skip.` : "",
        warningRows.length
          ? `${warningRows.length} warning dibetulkan secara automatik.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      alert(summary);

      closeUploadModal();
      await fetchMembers();
    } catch (error: any) {
      alert(error?.message || "Gagal import fail CSV.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Pengakap</h2>
          <p className="text-muted mb-0">
            Urus maklumat ahli pengakap mengikut kumpulan.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={() => setShowUploadModal(true)}
          >
            <i className="bi bi-upload me-1"></i>
            Import Fail
          </button>

          <button
            type="button"
            className="btn btn-success"
            onClick={openAddModal}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Tambah Ahli
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Ahli</small>
              <h4 className="fw-bold mb-0">{members.length}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h4 className="fw-bold text-success mb-0">
                {members.filter((member) => isActive(member.status)).length}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Aktif</small>
              <h4 className="fw-bold text-secondary mb-0">
                {members.filter((member) => !isActive(member.status)).length}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Kumpulan</small>
              <h4 className="fw-bold mb-0">{groups.length}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4 rounded-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Cari nama, IC, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Filter no tel..."
                value={phoneFilter}
                maxLength={13}
                onChange={(e) =>
                  setPhoneFilter(formatMalaysianPhone(e.target.value))
                }
              />
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.group_name}>
                    {group.group_name}
                  </option>
                ))}
              </select>
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

            <div className="col-md-1">
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
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No IC / MyKid</th>
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Jantina</th>
                <th>Telefon Penjaga</th>
                <th>Status</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan data...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 36, height: 36 }}
                        >
                          {getInitials(member.full_name || "-")}
                        </div>

                        <div>
                          <div className="fw-semibold">{member.full_name}</div>
                          <small className="text-muted">
                            {member.email || "-"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{displayMalaysianIC(member.ic_number)}</td>
                    <td>{member.group_name || "-"}</td>
                    <td>{member.category || member.scout_category || "-"}</td>
                    <td>{member.age || "-"}</td>
                    <td>{member.gender || "-"}</td>
                    <td>{displayMalaysianPhone(member.guardian_phone)}</td>

                    <td>
                      <span
                        className={`badge ${
                          isActive(member.status)
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(member.status)}
                      </span>
                    </td>

                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success me-1"
                        onClick={() => openViewModal(member)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(member)}
                      >
                        Edit
                      </button>

                      {isActive(member.status) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => openDeleteModal(member)}
                        >
                          Nyahaktif
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Import Ahli Pengakap</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeUploadModal}
                  disabled={importing}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-3">
                    <label className="form-label">Default Kumpulan</label>
                    <select
                      className="form-select"
                      value={importDefaultGroupId}
                      onChange={(e) => setImportDefaultGroupId(e.target.value)}
                      disabled={importing}
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Diguna kalau UNIT PENG tak match.
                    </small>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Default Kategori</label>
                    <select
                      className="form-select"
                      value={importDefaultCategory}
                      onChange={(e) =>
                        setImportDefaultCategory(e.target.value)
                      }
                      disabled={importing}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Default Jantina</label>
                    <select
                      className="form-select"
                      value={importDefaultGender}
                      onChange={(e) => setImportDefaultGender(e.target.value)}
                      disabled={importing}
                    >
                      {GENDER_OPTIONS.map((gender) => (
                        <option key={gender}>{gender}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Default Status</label>
                    <select
                      className="form-select"
                      value={importDefaultStatus}
                      onChange={(e) => setImportDefaultStatus(e.target.value)}
                      disabled={importing}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <h5 className="fw-bold mb-3">
                  <i className="bi bi-cloud-upload me-2"></i>
                  Muat Naik Fail
                </h5>

                <label
                  htmlFor="member-import-file"
                  className="w-100 border border-success-subtle rounded-3 p-5 text-center"
                  style={{
                    cursor: "pointer",
                    background: "#f8fffb",
                    minHeight: "220px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div>
                    <i className="bi bi-cloud-arrow-up fs-1 text-success"></i>

                    <div className="fw-bold mt-3">
                      {importFile ? importFile.name : "Klik untuk memilih fail"}
                    </div>

                    <div className="text-muted mt-2">
                      CSV sahaja. Format BIL, NAMA PEN, NO. K.P., JANTINA,
                      KETURUNAN, TARIKH LAHIR, UNIT PENG, NO. WOS, EMAIL
                      disokong.
                    </div>

                    {importFile && (
                      <div className="small text-success mt-2">
                        Fail sudah dipilih. Tekan Import Ahli untuk teruskan.
                      </div>
                    )}
                  </div>
                </label>

                <input
                  ref={fileInputRef}
                  id="member-import-file"
                  type="file"
                  className="d-none"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleImportFileChange}
                  disabled={importing}
                />

                <div className="alert alert-info mt-3 mb-0">
                  <div className="fw-semibold mb-1">
                    Format CSV yang disokong:
                  </div>
                  <code>
                    BIL, NAMA PEN, NO. K.P., JANTINA, KETURUNAN, TARIKH LAHIR,
                    UNIT PENG, NO. WOS, EMAIL
                  </code>
                  <div className="small text-muted mt-2">
                    Kalau IC sudah wujud, sistem akan skip ahli tersebut dan
                    import ahli baru sahaja.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeUploadModal}
                  disabled={importing}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <i className="bi bi-folder2-open me-1"></i>
                  Pilih Fail
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={importMembersFromCSV}
                  disabled={importing || !importFile}
                >
                  {importing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Mengimport...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-1"></i>
                      Import Ahli
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingMember
                    ? "Edit Ahli Pengakap"
                    : "Tambah Ahli Pengakap"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowMemberModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">No IC / MyKid</label>
                    <input
                      className="form-control"
                      value={form.ic_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ic_number: formatMalaysianIC(e.target.value),
                        })
                      }
                      placeholder="030101-03-1234"
                      maxLength={14}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">E-mel Ahli / Penjaga</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <select
                      className="form-select"
                      value={form.group_id}
                      onChange={(e) => {
                        const selectedGroup = groups.find(
                          (group) => group.id === e.target.value
                        );

                        setForm({
                          ...form,
                          group_id: e.target.value,
                          group_name: selectedGroup?.group_name || "",
                        });
                      }}
                      disabled={saving}
                    >
                      <option value="">Pilih Kumpulan</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      disabled={saving}
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
                      className="form-control"
                      value={form.age}
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                      disabled={saving}
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
                      disabled={saving}
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
                      onChange={(e) =>
                        setForm({ ...form, guardian_name: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          guardian_phone: formatMalaysianPhone(e.target.value),
                        })
                      }
                      maxLength={13}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email Penjaga</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.guardian_email}
                      onChange={(e) =>
                        setForm({ ...form, guardian_email: e.target.value })
                      }
                      disabled={saving}
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
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Alamat</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      disabled={saving}
                    ></textarea>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      disabled={saving}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowMemberModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveMember}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingMember
                    ? "Simpan Perubahan"
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
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Ahli</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <h5 className="fw-bold">{selectedMember.full_name}</h5>
                <p className="text-muted mb-3">
                  {selectedMember.group_name || "-"}
                </p>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span>No IC / MyKid</span>
                    <strong>
                      {displayMalaysianIC(selectedMember.ic_number)}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Kategori</span>
                    <strong>
                      {selectedMember.category ||
                        selectedMember.scout_category ||
                        "-"}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Umur</span>
                    <strong>{selectedMember.age || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Jantina</span>
                    <strong>{selectedMember.gender || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Penjaga</span>
                    <strong>{selectedMember.guardian_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Telefon</span>
                    <strong>
                      {displayMalaysianPhone(selectedMember.guardian_phone)}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Status</span>
                    <strong>{normalizeStatus(selectedMember.status)}</strong>
                  </div>

                  <div className="list-group-item">
                    <span className="d-block text-muted mb-1">Catatan</span>
                    <strong>{selectedMember.notes || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
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

      {showDeleteModal && deleteTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Nyahaktif Ahli
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktifkan ahli ini?
                </p>

                <strong>{deleteTarget.full_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Rekod tidak dipadam. Status akan ditukar kepada Tidak Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateMember}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Ya, Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}