import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";
import { addAuditLog } from "../../utils/auditLog";

const MEMBERS_PER_PAGE = 10;

const scoutDistrictsByState: Record<string, string[]> = {
  Selangor: [
    "Gombak",
    "Hulu Langat",
    "Hulu Selangor",
    "Kajang",
    "Klang",
    "Kuala Langat",
    "Kuala Selangor",
    "Petaling Perdana",
    "Petaling Utama",
    "Putrajaya",
    "Sabak Bernam",
    "Sepang",
    "Sungai Besar",
    "Tanjong Karang",
  ],

  "Wilayah Persekutuan Kuala Lumpur": [
    "Batu",
    "Kepong",
    "Segambut",
    "Wangsa Maju",
    "Setiawangsa",
    "Titiwangsa",
    "Bukit Bintang",
    "Seputeh",
    "Lembah Pantai",
    "Bandar Tun Razak",
    "Cheras",
  ],

  Pahang: [
    "Bera",
    "Bentong",
    "Cameron Highlands",
    "Jerantut",
    "Kuantan",
    "Lipis",
    "Maran",
    "Pekan",
    "Raub",
    "Rompin",
    "Temerloh",
  ],
};

type ScoutGroup = {
  id: string;
  group_name: string;
  group_code: string | null;
  registration_no: string | null;
  registration_date: string | null;
  scout_state: string | null;
  scout_district: string | null;
  school_name: string | null;
  leader_user_id: string | null;
  leader_name: string | null;
  total_members: number | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type Member = {
  id: string;
  member_no: string | null;
  full_name: string;
  email: string | null;
  group_id: string | null;
  group_name: string | null;
  status: string | null;
  category: string | null;
  scout_category: string | null;
  gender: string | null;
  ic_number: string | null;
  age: number | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  membership_expiry_date: string | null;
  address: string | null;
  notes: string | null;
  district: string | null;
  district_environment_id: string | null;
  created_at: string | null;
  updated_at?: string | null;
  deleted_at: string | null;
};

type LeaderUser = {
  id: string;
  full_name: string;
  email: string | null;
};

type GroupForm = {
  group_name: string;
  group_code: string;
  registration_no: string;
  registration_date: string;
  scout_state: string;
  scout_district: string;
  leader_user_id: string;
  leader_name: string;
  status: string;
};

type MemberForm = {
  member_no: string;
  ic_number: string;
  full_name: string;
  email: string;
  category: string;
  membership_expiry_date: string;
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

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "aktif" || value === "active") return "Aktif";
  if (value === "tidak aktif" || value === "inactive") return "Tidak Aktif";

  return status || "Aktif";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeDateForInput(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const cleaned = raw.replace(/[./]/g, "-");
  const parts = cleaned.split("-").map((part) => part.trim());

  if (parts.length === 3) {
    let day = Number(parts[0]);
    let month = Number(parts[1]);
    let year = Number(parts[2]);

    if (parts[0].length === 4) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    }

    if (
      !Number.isNaN(day) &&
      !Number.isNaN(month) &&
      !Number.isNaN(year) &&
      year > 1900 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
  }

  const monthMap: Record<string, string> = {
    jan: "01",
    januari: "01",
    feb: "02",
    februari: "02",
    mac: "03",
    march: "03",
    apr: "04",
    april: "04",
    mei: "05",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    ogos: "08",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    okt: "10",
    october: "10",
    nov: "11",
    november: "11",
    dis: "12",
    december: "12",
  };

  const words = raw.toLowerCase().replace(/,/g, "").split(/\s+/);

  if (words.length >= 3) {
    const day = Number(words[0]);
    const month = monthMap[words[1]];
    const year = Number(words[2]);

    if (!Number.isNaN(day) && month && !Number.isNaN(year)) {
      return `${year}-${month}-${String(day).padStart(2, "0")}`;
    }
  }

  return "";
}

function getInitials(name: string) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
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

function displayMalaysianIC(value?: string | null) {
  if (!value) return "-";
  return formatMalaysianIC(value);
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

function isValidEmail(email?: string | null) {
  const value = String(email || "").trim();

  if (!value) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getDefaultState(currentUser: any) {
  const raw =
    currentUser.scout_state ||
    currentUser.state ||
    currentUser.state_name ||
    currentUser.negeri ||
    "";

  if (raw && scoutDistrictsByState[raw]) return raw;

  return "Wilayah Persekutuan Kuala Lumpur";
}

function getDefaultScoutDistrict(currentUser: any, state: string) {
  const raw =
    currentUser.scout_district ||
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    "";

  if (raw && scoutDistrictsByState[state]?.includes(raw)) return raw;

  return scoutDistrictsByState[state]?.[0] || "";
}

function getMembershipExpiryClass(value?: string | null) {
  const normalized = normalizeDateForInput(value);

  if (!normalized) return "bg-secondary";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(`${normalized}T00:00:00`);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) return "bg-danger";

  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 60) return "bg-warning text-dark";

  return "bg-success";
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

function parseCSVText(text: string) {
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

  const delimiter = detectDelimiter(lines[0] || "");
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

  return rows.slice(1).map((cells, index) => {
    const item: Record<string, string> = {};

    headers.forEach((header, cellIndex) => {
      item[header] = cells[cellIndex]?.trim() || "";
    });

    item.__rowNumber = String(index + 2);
    return item;
  });
}

async function parseImportFile(file: File): Promise<Record<string, string>[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const text = await file.text();
    return parseCSVText(text);
  }

  throw new Error("Format fail tidak disokong. Sila guna CSV atau TXT sahaja.");
}

function getImportValue(row: Record<string, string>, keys: string[]) {
  const rowKeys = Object.keys(row);

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);

    if (row[normalizedKey]) return row[normalizedKey];

    const fuzzyKey = rowKeys.find((rowKey) => {
      if (rowKey.startsWith("__")) return false;

      return (
        rowKey === normalizedKey ||
        rowKey.includes(normalizedKey) ||
        normalizedKey.includes(rowKey)
      );
    });

    if (fuzzyKey && row[fuzzyKey]) return row[fuzzyKey];
  }

  return "";
}

function normalizeGenderValue(value: string, fallback = "Lelaki") {
  const gender = String(value || "").trim().toLowerCase();

  if (["lelaki", "male", "l", "m"].includes(gender)) return "Lelaki";
  if (["perempuan", "female", "p", "f"].includes(gender)) return "Perempuan";

  return fallback;
}

function estimateAgeFromBirthDate(value: string) {
  const normalized = normalizeDateForInput(value);

  if (!normalized) return null;

  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();

  const hasBirthdayPassed =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());

  if (!hasBirthdayPassed) age -= 1;

  if (age < 0 || age > 100) return null;

  return age;
}

export default function GroupDetailPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const id = groupId || "";
  const currentUser = useMemo(() => getCurrentUser(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const districtEnvironmentId = currentUser.district_environment_id || null;

  const userDistrict =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  const defaultState = useMemo(() => getDefaultState(currentUser), [currentUser]);

  const defaultScoutDistrict = useMemo(
    () => getDefaultScoutDistrict(currentUser, defaultState),
    [currentUser, defaultState]
  );

  const [group, setGroup] = useState<ScoutGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  const [activityCount, setActivityCount] = useState(0);
  const [memberPage, setMemberPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [importDefaultCategory, setImportDefaultCategory] = useState(
    "Pengakap Kanak-Kanak"
  );
  const [importDefaultGender, setImportDefaultGender] = useState("Lelaki");
  const [importDefaultStatus, setImportDefaultStatus] = useState("Aktif");
  const [importDefaultExpiryDate, setImportDefaultExpiryDate] =
    useState("2026-03-31");

  const [form, setForm] = useState<GroupForm>({
    group_name: "",
    group_code: "",
    registration_no: "",
    registration_date: "",
    scout_state: defaultState,
    scout_district: defaultScoutDistrict,
    leader_user_id: "",
    leader_name: "",
    status: "Aktif",
  });

  const [memberForm, setMemberForm] = useState<MemberForm>({
    member_no: "",
    ic_number: "",
    full_name: "",
    email: "",
    category: "Pengakap Kanak-Kanak",
    membership_expiry_date: "2026-03-31",
    age: "",
    gender: "Lelaki",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    notes: "",
    status: "Aktif",
  });

  const districtOptions = useMemo(() => {
    return scoutDistrictsByState[form.scout_state] || [];
  }, [form.scout_state]);

  const activeMembers = useMemo(() => {
    return members.filter((member) => isActive(member.status));
  }, [members]);

  const inactiveMembers = useMemo(() => {
    return members.filter((member) => !isActive(member.status));
  }, [members]);

  const totalMemberPages = Math.max(
    1,
    Math.ceil(members.length / MEMBERS_PER_PAGE)
  );

  const paginatedMembers = useMemo(() => {
    const startIndex = (memberPage - 1) * MEMBERS_PER_PAGE;
    return members.slice(startIndex, startIndex + MEMBERS_PER_PAGE);
  }, [members, memberPage]);

  const memberStartNo =
    members.length === 0 ? 0 : (memberPage - 1) * MEMBERS_PER_PAGE + 1;

  const memberEndNo = Math.min(memberPage * MEMBERS_PER_PAGE, members.length);

  useEffect(() => {
    if (!id) {
      alert("ID kumpulan tidak sah. Sila semak route param untuk GroupDetailPage.");
      navigate("/district/groups");
      return;
    }

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (memberPage > totalMemberPages) {
      setMemberPage(totalMemberPages);
    }
  }, [memberPage, totalMemberPages]);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId && userDistrict) {
      return query.or(
        `district_environment_id.eq.${districtEnvironmentId},and(district_environment_id.is.null,district.eq.${userDistrict})`
      );
    }

    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (userDistrict) {
      return query.eq("district", userDistrict);
    }

    return query;
  }

  async function fetchAll() {
    setLoading(true);

    try {
      const selectedGroup = await fetchGroup();

      if (selectedGroup) {
        await Promise.all([
          fetchMembers(selectedGroup),
          fetchLeaders(),
          fetchActivities(),
        ]);
      }
    } catch (error: any) {
      console.error("Fetch group detail error:", error);
      alert(error?.message || "Gagal memuatkan maklumat kumpulan.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroup() {
    let query = supabase
      .from("groups")
      .select(
        `
        id,
        group_name,
        group_code,
        registration_no,
        registration_date,
        scout_state,
        scout_district,
        school_name,
        leader_user_id,
        leader_name,
        total_members,
        status,
        district,
        district_environment_id,
        created_at,
        updated_at,
        deleted_at
      `
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) throw error;

    const selectedGroup = data as ScoutGroup;

    setGroup(selectedGroup);

    const selectedScoutState =
      selectedGroup.scout_state && scoutDistrictsByState[selectedGroup.scout_state]
        ? selectedGroup.scout_state
        : defaultState;

    const selectedScoutDistrict =
      selectedGroup.scout_district &&
      scoutDistrictsByState[selectedScoutState]?.includes(selectedGroup.scout_district)
        ? selectedGroup.scout_district
        : scoutDistrictsByState[selectedScoutState]?.[0] || "";

    setForm({
      group_name: selectedGroup.group_name || "",
      group_code: selectedGroup.group_code || "",
      registration_no: selectedGroup.registration_no || "",
      registration_date: normalizeDateForInput(selectedGroup.registration_date || ""),
      scout_state: selectedScoutState,
      scout_district: selectedScoutDistrict,
      leader_user_id: selectedGroup.leader_user_id || "",
      leader_name: selectedGroup.leader_name || "",
      status: normalizeStatus(selectedGroup.status),
    });

    return selectedGroup;
  }

  async function fetchMembers(selectedGroup?: ScoutGroup | null) {
    const currentGroup = selectedGroup || group;

    let query = supabase
      .from("members")
      .select(
        `
        id,
        member_no,
        full_name,
        email,
        group_id,
        group_name,
        status,
        category,
        scout_category,
        gender,
        ic_number,
        age,
        guardian_name,
        guardian_phone,
        guardian_email,
        membership_expiry_date,
        address,
        notes,
        district,
        district_environment_id,
        created_at,
        updated_at,
        deleted_at
      `
      )
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) throw error;

    const memberList = ((data || []) as Member[]).filter((member) => {
      if (member.group_id && member.group_id === id) return true;

      if (
        !member.group_id &&
        currentGroup?.group_name &&
        member.group_name === currentGroup.group_name
      ) {
        return true;
      }

      return false;
    });

    setMembers(memberList);
    setMemberPage(1);
  }

  async function fetchLeaders() {
    let query = supabase
      .from("system_users")
      .select("id, full_name, email")
      .in("role", ["Pemimpin Kumpulan", "group_leader"])
      .in("status", ["Aktif", "active"])
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.warn("Fetch leaders warning:", error.message);
      setLeaders([]);
      return;
    }

    setLeaders((data || []) as LeaderUser[]);
  }

  async function fetchActivities() {
    try {
      let query = supabase
        .from("activities")
        .select("id")
        .eq("group_id", id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { data, error } = await query;

      if (error) {
        console.warn("Fetch activities warning:", error.message);
        setActivityCount(0);
        return;
      }

      setActivityCount((data || []).length);
    } catch {
      setActivityCount(0);
    }
  }

  function resetMemberForm() {
    setEditingMember(null);

    setMemberForm({
      member_no: "",
      ic_number: "",
      full_name: "",
      email: "",
      category: "Pengakap Kanak-Kanak",
      membership_expiry_date: "2026-03-31",
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

  function openAddMemberModal() {
    resetMemberForm();
    setShowMemberModal(true);
  }

  function openEditMemberModal(member: Member) {
    setEditingMember(member);

    setMemberForm({
      member_no: member.member_no || "",
      ic_number: formatMalaysianIC(member.ic_number || ""),
      full_name: member.full_name || "",
      email: member.email || "",
      category: member.category || member.scout_category || "Pengakap Kanak-Kanak",
      membership_expiry_date: normalizeDateForInput(
        member.membership_expiry_date || ""
      ),
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

  function closeMemberModal() {
    setShowMemberModal(false);
    resetMemberForm();
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

    if (
      !fileName.endsWith(".csv") &&
      !fileName.endsWith(".txt") &&
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xls")
    ) {
      alert("Sila guna fail CSV, TXT atau XLS sahaja.");
      event.target.value = "";
      setImportFile(null);
      return;
    }

    setImportFile(file);
  }

  function validateForm() {
    if (!form.group_name.trim()) {
      alert("Sila isi nama kumpulan.");
      return false;
    }

    if (!form.group_code.trim()) {
      alert("Sila isi No Kumpulan.");
      return false;
    }

    if (!form.registration_no.trim()) {
      alert("Sila isi No Pendaftaran.");
      return false;
    }

    if (!form.registration_date) {
      alert("Sila pilih Tarikh Pendaftaran.");
      return false;
    }

    if (!form.scout_state) {
      alert("Sila pilih negeri.");
      return false;
    }

    if (!form.scout_district) {
      alert("Sila pilih daerah pengakap.");
      return false;
    }

    return true;
  }

  function validateMemberForm() {
    if (!group) return false;

    if (!memberForm.full_name.trim()) {
      alert("Sila isi nama penuh ahli.");
      return false;
    }

    if (
      memberForm.ic_number.trim() &&
      !isValidMalaysianIC(memberForm.ic_number)
    ) {
      alert("No IC / MyKid tidak sah. Contoh: 030101-03-1234.");
      return false;
    }

    if (memberForm.email && !isValidEmail(memberForm.email)) {
      alert("Format e-mel ahli tidak sah.");
      return false;
    }

    if (
      memberForm.guardian_phone.trim() &&
      !isValidMalaysianPhone(memberForm.guardian_phone)
    ) {
      alert("Nombor telefon penjaga tidak sah. Contoh: 012-345 6789.");
      return false;
    }

    if (memberForm.guardian_email && !isValidEmail(memberForm.guardian_email)) {
      alert("Format e-mel penjaga tidak sah.");
      return false;
    }

    const ageNumber = Number(memberForm.age);

    if (
      memberForm.age &&
      (Number.isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 100)
    ) {
      alert("Umur tidak sah.");
      return false;
    }

    return true;
  }

  async function checkDuplicateGroupName() {
    let query = supabase
      .from("groups")
      .select("id")
      .ilike("group_name", form.group_name.trim())
      .is("deleted_at", null)
      .neq("id", id)
      .limit(1);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function checkDuplicateGroupCode() {
    let query = supabase
      .from("groups")
      .select("id")
      .ilike("group_code", form.group_code.trim())
      .is("deleted_at", null)
      .neq("id", id)
      .limit(1);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
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

  async function syncGroupReferences(params: {
    groupId: string;
    oldGroupName: string | null;
    newGroupName: string;
    leaderUserId: string | null;
  }) {
    const { groupId, oldGroupName, newGroupName, leaderUserId } = params;
    const now = new Date().toISOString();

    try {
      let memberByGroupIdQuery = supabase
        .from("members")
        .update({
          group_name: newGroupName,
          updated_at: now,
        })
        .eq("group_id", groupId)
        .is("deleted_at", null);

      memberByGroupIdQuery = applyDistrictScope(memberByGroupIdQuery);

      const { error } = await memberByGroupIdQuery;

      if (error) {
        console.warn("Sync members by group_id warning:", error.message);
      }
    } catch (error: any) {
      console.warn("Sync members by group_id failed:", error?.message);
    }

    if (oldGroupName && oldGroupName !== newGroupName) {
      try {
        let memberByOldNameQuery = supabase
          .from("members")
          .update({
            group_name: newGroupName,
            updated_at: now,
          })
          .eq("group_name", oldGroupName)
          .is("deleted_at", null);

        memberByOldNameQuery = applyDistrictScope(memberByOldNameQuery);

        const { error } = await memberByOldNameQuery;

        if (error) {
          console.warn("Sync members by old group name warning:", error.message);
        }
      } catch (error: any) {
        console.warn("Sync members by old group name failed:", error?.message);
      }

      try {
        let usersByOldNameQuery = supabase
          .from("system_users")
          .update({
            group_name: newGroupName,
            updated_at: now,
          })
          .eq("group_name", oldGroupName)
          .is("deleted_at", null);

        usersByOldNameQuery = applyDistrictScope(usersByOldNameQuery);

        const { error } = await usersByOldNameQuery;

        if (error) {
          console.warn("Sync system_users by old group name warning:", error.message);
        }
      } catch (error: any) {
        console.warn("Sync system_users by old group name failed:", error?.message);
      }
    }

    if (leaderUserId) {
      try {
        let selectedLeaderQuery = supabase
          .from("system_users")
          .update({
            group_name: newGroupName,
            updated_at: now,
          })
          .eq("id", leaderUserId)
          .is("deleted_at", null);

        selectedLeaderQuery = applyDistrictScope(selectedLeaderQuery);

        const { error } = await selectedLeaderQuery;

        if (error) {
          console.warn("Sync selected leader warning:", error.message);
        }
      } catch (error: any) {
        console.warn("Sync selected leader failed:", error?.message);
      }
    }
  }

  async function saveGroup() {
    if (!group || !id) return;
    if (!validateForm()) return;

    setSaving(true);

    try {
      const duplicateName = await checkDuplicateGroupName();

      if (duplicateName) {
        alert("Nama kumpulan ini sudah wujud dalam daerah ini.");
        setSaving(false);
        return;
      }

      const duplicateCode = await checkDuplicateGroupCode();

      if (duplicateCode) {
        alert("No Kumpulan ini sudah wujud dalam daerah ini.");
        setSaving(false);
        return;
      }

      const selectedLeader = leaders.find(
        (leader) => leader.id === form.leader_user_id
      );

      const oldGroupName = group.group_name || null;

      const payload = {
        group_name: form.group_name.trim(),
        group_code: form.group_code.trim(),
        registration_no: form.registration_no.trim(),
        registration_date: form.registration_date || null,
        scout_state: form.scout_state,
        scout_district: form.scout_district,
        school_name: form.group_name.trim(),
        leader_user_id: form.leader_user_id || null,
        leader_name: selectedLeader?.full_name || form.leader_name || null,
        status: form.status,
        district: group.district || userDistrict || null,
        district_environment_id:
          group.district_environment_id || districtEnvironmentId || null,
        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("groups")
        .update(payload)
        .eq("id", id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await syncGroupReferences({
        groupId: id,
        oldGroupName,
        newGroupName: payload.group_name,
        leaderUserId: payload.leader_user_id,
      });

      await addAuditLog(
        "UPDATE",
        "Kumpulan / Sekolah",
        `Kemaskini kumpulan ${oldGroupName || "-"} kepada ${payload.group_name}`
      );

      alert("Kumpulan berjaya dikemaskini.");

      setShowEditModal(false);
      await fetchAll();
    } catch (error: any) {
      console.error("Save group error:", error);
      alert(error?.message || "Gagal simpan kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMember() {
    if (!group) return;
    if (!validateMemberForm()) return;

    setSaving(true);

    try {
      const cleanIC = normalizeMalaysianIC(memberForm.ic_number);

      if (cleanIC) {
        const duplicateIC = await checkDuplicateIC(cleanIC, editingMember?.id);

        if (duplicateIC) {
          alert("No IC / MyKid ini sudah wujud dalam daerah ini.");
          setSaving(false);
          return;
        }
      }

      const payload = {
        member_no: memberForm.member_no.trim() || null,
        ic_number: cleanIC || null,
        full_name: memberForm.full_name.trim(),
        email: memberForm.email.trim() || null,
        group_id: group.id,
        group_name: group.group_name,
        category: memberForm.category,
        scout_category: memberForm.category,
        membership_expiry_date:
          normalizeDateForInput(memberForm.membership_expiry_date) || null,
        age: memberForm.age ? Number(memberForm.age) : null,
        gender: memberForm.gender || null,
        guardian_name: memberForm.guardian_name.trim() || null,
        guardian_phone: normalizeMalaysianPhone(memberForm.guardian_phone) || null,
        guardian_email: memberForm.guardian_email.trim() || null,
        address: memberForm.address.trim() || null,
        notes: memberForm.notes.trim() || null,
        status: memberForm.status,
        district: group.district || userDistrict || null,
        district_environment_id:
          group.district_environment_id || districtEnvironmentId || null,
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

        if (error) throw error;

        await addAuditLog(
          "UPDATE",
          "Ahli Pengakap",
          `Kemaskini ahli ${payload.full_name} dalam kumpulan ${group.group_name}`
        );
      } else {
        const { error } = await supabase.from("members").insert({
          ...payload,
          created_at: new Date().toISOString(),
          deleted_at: null,
        });

        if (error) throw error;

        await addAuditLog(
          "CREATE",
          "Ahli Pengakap",
          `Tambah ahli ${payload.full_name} ke kumpulan ${group.group_name}`
        );
      }

      await fetchMembers(group);
      closeMemberModal();
      alert(editingMember ? "Ahli berjaya dikemaskini." : "Ahli berjaya ditambah.");
    } catch (error: any) {
      console.error("Save member error:", error);
      alert(error?.message || "Gagal simpan ahli.");
    } finally {
      setSaving(false);
    }
  }

  async function importMembersToCurrentGroup() {
    if (!group) return;

    if (!importFile) {
      alert("Sila pilih fail dahulu.");
      return;
    }

    setImporting(true);

    try {
      const rows = await parseImportFile(importFile);

      if (rows.length === 0) {
        alert("Fail kosong atau tiada data untuk diimport.");
        return;
      }

      const skippedRows: string[] = [];
      const warningRows: string[] = [];
      const icSet = new Set<string>();

      const preparedRows = rows
        .map((row) => {
          const rowNumber = row.__rowNumber || "-";

          const memberNo = getImportValue(row, [
            "NO KEAHLIAN",
            "No Keahlian",
            "member_no",
            "membership no",
            "membership number",
            "no ahli",
          ]);

          const fullName = getImportValue(row, [
            "NAMA PEN",
            "Nama Pen",
            "Nama",
            "Nama Penuh",
            "Nama Ahli",
            "full_name",
            "name",
          ]);

          const rawIC = getImportValue(row, [
            "NO. K.P.",
            "No KP",
            "No IC",
            "IC",
            "MyKid",
            "ic_number",
          ]);

          const email = getImportValue(row, [
            "EMAIL",
            "Email",
            "Emel",
            "E-mel",
            "Email Ahli",
          ]);

          const category =
            getImportValue(row, [
              "KATEGORI",
              "Kategori",
              "Unit Pengakap",
              "UNIT PENG",
              "category",
            ]) || importDefaultCategory;

          const genderRaw = getImportValue(row, ["JANTINA", "Jantina", "Gender"]);

          const expiryRaw =
            getImportValue(row, [
              "SAH SEHINGGA",
              "Sah Sehingga",
              "Tarikh Sah",
              "Tarikh Tamat",
              "Expiry Date",
              "Valid Until",
            ]) || importDefaultExpiryDate;

          const birthDateRaw = getImportValue(row, [
            "TARIKH LAHIR",
            "Tarikh Lahir",
            "DOB",
            "Date of Birth",
          ]);

          const wosNo = getImportValue(row, ["NO. WOS", "No WOS", "WOS"]);

          const ethnicity = getImportValue(row, [
            "KETURUNAN",
            "Keturunan",
            "Bangsa",
            "Race",
          ]);

          const guardianName = getImportValue(row, [
            "Nama Penjaga",
            "Penjaga",
            "Parent Name",
          ]);

          const guardianPhone = getImportValue(row, [
            "Telefon Penjaga",
            "No Telefon",
            "Phone",
            "Telefon",
          ]);

          const guardianEmail = getImportValue(row, [
            "Email Penjaga",
            "Guardian Email",
            "Parent Email",
          ]);

          const address = getImportValue(row, ["Alamat", "Address"]);

          if (!fullName.trim()) {
            skippedRows.push(`Row ${rowNumber}: tiada nama`);
            return null;
          }

          const cleanIC = normalizeMalaysianIC(rawIC);
          const finalIC =
            cleanIC && isValidMalaysianIC(cleanIC) ? cleanIC : null;

          if (cleanIC && !finalIC) {
            warningRows.push(`Row ${rowNumber}: IC tidak sah, disimpan kosong`);
          }

          if (finalIC) {
            if (icSet.has(finalIC)) {
              skippedRows.push(`Row ${rowNumber}: IC duplicate dalam fail`);
              return null;
            }

            icSet.add(finalIC);
          }

          const finalEmail = isValidEmail(email) ? email.trim() || null : null;

          if (email && !finalEmail) {
            warningRows.push(`Row ${rowNumber}: email tidak sah, disimpan kosong`);
          }

          const membershipExpiryDate = normalizeDateForInput(expiryRaw);

          if (expiryRaw && !membershipExpiryDate) {
            warningRows.push(
              `Row ${rowNumber}: Sah Sehingga tidak sah, disimpan kosong`
            );
          }

          const cleanPhone = normalizeMalaysianPhone(guardianPhone);
          const finalPhone =
            cleanPhone && isValidMalaysianPhone(cleanPhone) ? cleanPhone : null;

          const finalGuardianEmail =
            guardianEmail && isValidEmail(guardianEmail)
              ? guardianEmail.trim()
              : null;

          const estimatedAge = estimateAgeFromBirthDate(birthDateRaw);

          const extraNotes = [
            wosNo ? `No WOS: ${wosNo}` : "",
            ethnicity ? `Keturunan: ${ethnicity}` : "",
            birthDateRaw ? `Tarikh Lahir: ${birthDateRaw}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          return {
            member_no: memberNo.trim() || null,
            ic_number: finalIC,
            full_name: fullName.trim(),
            email: finalEmail,

            group_id: group.id,
            group_name: group.group_name,

            category,
            scout_category: category,
            membership_expiry_date: membershipExpiryDate || null,

            age: estimatedAge,
            gender: normalizeGenderValue(genderRaw, importDefaultGender),

            guardian_name: guardianName.trim() || null,
            guardian_phone: finalPhone,
            guardian_email: finalGuardianEmail,
            address: address.trim() || null,
            notes: extraNotes || null,

            status: importDefaultStatus,
            district: group.district || userDistrict || null,
            district_environment_id:
              group.district_environment_id || districtEnvironmentId || null,

            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };
        })
        .filter(Boolean) as any[];

      if (preparedRows.length === 0) {
        alert(`Tiada row boleh diimport.\nSkipped: ${skippedRows.length}`);
        return;
      }

      const icList = preparedRows
        .map((row) => row.ic_number)
        .filter(Boolean) as string[];

      let duplicateICs: string[] = [];

      if (icList.length > 0) {
        let duplicateQuery = supabase
          .from("members")
          .select("ic_number")
          .in("ic_number", icList)
          .is("deleted_at", null);

        duplicateQuery = applyDistrictScope(duplicateQuery);

        const { data, error } = await duplicateQuery;

        if (error) throw error;

        duplicateICs = (data || [])
          .map((item: any) => item.ic_number)
          .filter(Boolean);
      }

      const finalRows = preparedRows.filter((row) => {
        if (!row.ic_number) return true;
        return !duplicateICs.includes(row.ic_number);
      });

      if (finalRows.length === 0) {
        alert("Semua data duplicate atau sudah wujud.");
        return;
      }

      for (let i = 0; i < finalRows.length; i += 500) {
        const chunk = finalRows.slice(i, i + 500);
        const { error } = await supabase.from("members").insert(chunk);

        if (error) throw error;
      }

      await addAuditLog(
        "IMPORT",
        "Ahli Pengakap",
        `Import ${finalRows.length} ahli ke kumpulan ${group.group_name}`
      );

      alert(
        [
          `${finalRows.length} ahli berjaya diimport ke ${group.group_name}.`,
          duplicateICs.length ? `${duplicateICs.length} IC duplicate di-skip.` : "",
          skippedRows.length ? `${skippedRows.length} row di-skip.` : "",
          warningRows.length ? `${warningRows.length} warning dibetulkan.` : "",
        ]
          .filter(Boolean)
          .join("\n")
      );

      closeUploadModal();
      await fetchMembers(group);
    } catch (error: any) {
      alert(error?.message || "Gagal import fail.");
    } finally {
      setImporting(false);
    }
  }

  async function deactivateGroup() {
    if (!group || !id) return;

    setSaving(true);

    try {
      let query = supabase
        .from("groups")
        .update({
          status: "Tidak Aktif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await addAuditLog(
        "DEACTIVATE",
        "Kumpulan / Sekolah",
        `Nyahaktif kumpulan ${group.group_name}`
      );

      alert("Kumpulan berjaya dinyahaktifkan.");

      setShowDeactivateModal(false);
      await fetchAll();
    } catch (error: any) {
      console.error("Deactivate group error:", error);
      alert(error?.message || "Gagal nyahaktif kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="district">
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">Memuatkan maklumat kumpulan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout role="district">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-circle fs-1 text-warning"></i>
            <h5 className="fw-bold mt-3">Kumpulan tidak dijumpai</h5>
            <p className="text-muted">
              Data kumpulan mungkin telah dipadam atau tiada akses.
            </p>
            <Link to="/district/groups" className="btn btn-success">
              Kembali ke Senarai Kumpulan
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <Link
          to="/district/groups"
          className="text-muted text-decoration-none d-inline-flex align-items-center mb-3"
        >
          <i className="bi bi-arrow-left me-1"></i>
          Kembali ke Senarai Kumpulan
        </Link>

        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <h2 className="fw-bold mb-1">{group.group_name}</h2>
            <p className="text-muted mb-0">
              {group.scout_state || "-"}{" "}
              {group.scout_district ? `• ${group.scout_district}` : ""}
            </p>
          </div>

          <div className="d-flex gap-2 flex-wrap align-items-start">
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={() => setShowUploadModal(true)}
            >
              <i className="bi bi-upload me-1"></i>
              Import Ahli
            </button>

            <button
              type="button"
              className="btn btn-outline-success"
              onClick={openAddMemberModal}
            >
              <i className="bi bi-person-plus me-1"></i>
              Tambah Ahli
            </button>

            <button
              type="button"
              className="btn btn-success"
              onClick={() => setShowEditModal(true)}
            >
              <i className="bi bi-pencil-square me-1"></i>
              Edit Group
            </button>

            {isActive(group.status) && (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setShowDeactivateModal(true)}
              >
                <i className="bi bi-x-circle me-1"></i>
                Nyahaktif
              </button>
            )}
          </div>
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
              <small className="text-muted">Ahli Aktif</small>
              <h4 className="fw-bold text-success mb-0">
                {activeMembers.length}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Aktif</small>
              <h4 className="fw-bold text-warning mb-0">
                {inactiveMembers.length}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktiviti</small>
              <h4 className="fw-bold mb-0">{activityCount}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <h5 className="fw-bold mb-0">Ringkasan Kumpulan</h5>
        </div>

        <div className="card-body px-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Nama Kumpulan</small>
                <strong>{group.group_name}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Status</small>
                <span
                  className={`badge ${
                    isActive(group.status) ? "bg-success" : "bg-secondary"
                  }`}
                >
                  {normalizeStatus(group.status)}
                </span>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">No Kumpulan</small>
                <strong>{group.group_code || "-"}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">No Pendaftaran</small>
                <strong>{group.registration_no || "-"}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">
                  Tarikh Pendaftaran
                </small>
                <strong>{formatDate(group.registration_date)}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">
                  Negeri / Daerah Pengakap
                </small>
                <strong>
                  {group.scout_state || "-"}{" "}
                  {group.scout_district ? `• ${group.scout_district}` : ""}
                </strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">
                  Pemimpin Kumpulan
                </small>
                <strong>{group.leader_name || "-"}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Tarikh Dicipta</small>
                <strong>{formatDate(group.created_at)}</strong>
              </div>
            </div>
          </div>

          <div className="alert alert-light border rounded-4 mt-4 mb-0">
            <i className="bi bi-info-circle me-2 text-success"></i>
            District Environment ID disembunyikan kerana ia hanya digunakan oleh
            sistem untuk kawalan data daerah.
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <div>
              <h5 className="fw-bold mb-1">Senarai Ahli Kumpulan</h5>
              <p className="text-muted small mb-0">
                Tambah, import dan kemaskini ahli terus dalam kumpulan ini.
              </p>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={() => setShowUploadModal(true)}
              >
                <i className="bi bi-upload me-1"></i>
                Import Ahli
              </button>

              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={openAddMemberModal}
              >
                <i className="bi bi-person-plus me-1"></i>
                Tambah Ahli
              </button>
            </div>
          </div>
        </div>

        <div className="card-body table-responsive px-4">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No Keahlian</th>
                <th>No IC / MyKid</th>
                <th>Kategori</th>
                <th>Sah Sehingga</th>
                <th>Jantina</th>
                <th>Status</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-5">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dalam kumpulan ini.
                    <div className="mt-3 d-flex justify-content-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={() => setShowUploadModal(true)}
                      >
                        <i className="bi bi-upload me-1"></i>
                        Import Ahli
                      </button>

                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={openAddMemberModal}
                      >
                        <i className="bi bi-person-plus me-1"></i>
                        Tambah Ahli Pertama
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
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

                    <td>{member.member_no || "-"}</td>
                    <td>{displayMalaysianIC(member.ic_number)}</td>
                    <td>{member.category || member.scout_category || "-"}</td>

                    <td>
                      {member.membership_expiry_date ? (
                        <span
                          className={`badge ${getMembershipExpiryClass(
                            member.membership_expiry_date
                          )}`}
                        >
                          {formatDate(member.membership_expiry_date)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>{member.gender || "-"}</td>

                    <td>
                      <span
                        className={`badge ${
                          isActive(member.status) ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(member.status)}
                      </span>
                    </td>

                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={() => openEditMemberModal(member)}
                        title="Edit ahli"
                      >
                        <i className="bi bi-pencil-square text-secondary me-1"></i>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {members.length > 0 && (
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-top pt-3 mt-3">
              <div className="text-muted">
                Papar <strong>{memberStartNo}</strong>-
                <strong>{memberEndNo}</strong> daripada{" "}
                <strong>{members.length}</strong> ahli
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  disabled={memberPage === 1}
                  onClick={() => setMemberPage(1)}
                  title="Halaman pertama"
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>

                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  disabled={memberPage === 1}
                  onClick={() => setMemberPage((prev) => Math.max(1, prev - 1))}
                  title="Halaman sebelumnya"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <span className="btn btn-success rounded-3 px-4 disabled">
                  {memberPage} / {totalMemberPages}
                </span>

                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  disabled={memberPage === totalMemberPages}
                  onClick={() =>
                    setMemberPage((prev) =>
                      Math.min(totalMemberPages, prev + 1)
                    )
                  }
                  title="Halaman seterusnya"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>

                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  disabled={memberPage === totalMemberPages}
                  onClick={() => setMemberPage(totalMemberPages)}
                  title="Halaman terakhir"
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showUploadModal && group && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Import Ahli Kumpulan</h5>
                  <small className="text-muted">
                    Semua data akan dimasukkan ke kumpulan{" "}
                    <strong>{group.group_name}</strong>.
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeUploadModal}
                  disabled={importing}
                ></button>
              </div>

              <div className="modal-body">
                <div className="alert alert-success rounded-4">
                  <i className="bi bi-check-circle me-2"></i>
                  Kumpulan dipilih secara automatik:{" "}
                  <strong>{group.group_name}</strong>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-3">
                    <label className="form-label">Default Kategori</label>
                    <select
                      className="form-select"
                      value={importDefaultCategory}
                      onChange={(e) => setImportDefaultCategory(e.target.value)}
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

                  <div className="col-md-3">
                    <label className="form-label">Default Sah Sehingga</label>
                    <input
                      type="date"
                      className="form-control"
                      value={importDefaultExpiryDate}
                      onChange={(e) => setImportDefaultExpiryDate(e.target.value)}
                      disabled={importing}
                    />
                  </div>
                </div>

                <label
                  htmlFor="group-member-import-file"
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
                      Sokong fail CSV, TXT dan XLS.
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
                  id="group-member-import-file"
                  type="file"
                  className="d-none"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleImportFileChange}
                  disabled={importing}
                />

                <div className="alert alert-info mt-3 mb-0">
                  <div className="fw-semibold mb-1">Format yang disokong:</div>
                  <code>
                    NO KEAHLIAN, NAMA PEN, NO. K.P., JANTINA, KETURUNAN, TARIKH
                    LAHIR, UNIT PENG, NO. WOS, EMAIL, SAH SEHINGGA
                  </code>
                  <div className="small text-muted mt-2">
                    IC/MyKid dan Email boleh kosong. Nama ahli sahaja wajib.
                    Kumpulan akan ikut group page yang sedang dibuka.
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
                  onClick={importMembersToCurrentGroup}
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
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingMember ? "Edit Ahli Kumpulan" : "Tambah Ahli Kumpulan"}
                  </h5>
                  <small className="text-muted">
                    Kumpulan: <strong>{group.group_name}</strong>
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeMemberModal}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">No Keahlian</label>
                    <input
                      className="form-control"
                      value={memberForm.member_no}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          member_no: e.target.value,
                        })
                      }
                      placeholder="Contoh: WP118-1812"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={memberForm.full_name}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          full_name: e.target.value,
                        })
                      }
                      placeholder="Nama penuh ahli"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      IC/MyKid{" "}
                      <span className="text-muted small">(optional)</span>
                    </label>
                    <input
                      className="form-control"
                      value={memberForm.ic_number}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          ic_number: formatMalaysianIC(e.target.value),
                        })
                      }
                      placeholder="Kosongkan jika tiada IC/MyKid"
                      maxLength={14}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Email Ahli{" "}
                      <span className="text-muted small">(optional)</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={memberForm.email}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="Kosongkan jika tiada email"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <input
                      className="form-control bg-light"
                      value={group.group_name}
                      readOnly
                    />
                    <small className="text-muted">
                      Ahli ini akan terus dimasukkan ke kumpulan ini.
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-select"
                      value={memberForm.category}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          category: e.target.value,
                        })
                      }
                      disabled={saving}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Sah Sehingga</label>
                    <input
                      type="date"
                      className="form-control"
                      value={memberForm.membership_expiry_date}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          membership_expiry_date: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                    <small className="text-muted">
                      Contoh kad: Sah Sehingga 31 Mac 2026.
                    </small>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Umur</label>
                    <input
                      type="number"
                      className="form-control"
                      value={memberForm.age}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          age: e.target.value,
                        })
                      }
                      placeholder="Umur"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Jantina</label>
                    <select
                      className="form-select"
                      value={memberForm.gender}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          gender: e.target.value,
                        })
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
                      value={memberForm.guardian_name}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          guardian_name: e.target.value,
                        })
                      }
                      placeholder="Nama ibu/bapa/penjaga"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon Penjaga</label>
                    <input
                      className="form-control"
                      value={memberForm.guardian_phone}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          guardian_phone: formatMalaysianPhone(e.target.value),
                        })
                      }
                      placeholder="012-345 6789"
                      maxLength={13}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email Penjaga</label>
                    <input
                      type="email"
                      className="form-control"
                      value={memberForm.guardian_email}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          guardian_email: e.target.value,
                        })
                      }
                      placeholder="penjaga@example.com"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={memberForm.status}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          status: e.target.value,
                        })
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
                      value={memberForm.address}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          address: e.target.value,
                        })
                      }
                      placeholder="Alamat ahli / penjaga"
                      disabled={saving}
                    ></textarea>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={memberForm.notes}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Catatan tambahan"
                      disabled={saving}
                    ></textarea>
                  </div>
                </div>

                <div className="alert alert-info rounded-4 small mt-4 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  IC/MyKid dan email ahli tidak wajib. Minimum data yang perlu
                  ialah nama penuh.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeMemberModal}
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
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Menyimpan...
                    </>
                  ) : editingMember ? (
                    "Simpan Perubahan"
                  ) : (
                    "Simpan Ahli"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit Kumpulan</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nama Kumpulan</label>
                    <input
                      className="form-control"
                      value={form.group_name}
                      onChange={(event) =>
                        setForm({ ...form, group_name: event.target.value })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">No Kumpulan</label>
                    <input
                      className="form-control"
                      value={form.group_code}
                      onChange={(event) =>
                        setForm({ ...form, group_code: event.target.value })
                      }
                      placeholder="Contoh: KP-001"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">No Pendaftaran</label>
                    <input
                      className="form-control"
                      value={form.registration_no}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          registration_no: event.target.value,
                        })
                      }
                      placeholder="Contoh: MY-SCT-2026-001"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh Pendaftaran</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.registration_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          registration_date: event.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Negeri</label>
                    <select
                      className="form-select"
                      value={form.scout_state}
                      onChange={(event) => {
                        const newState = event.target.value;
                        const firstDistrict =
                          scoutDistrictsByState[newState]?.[0] || "";

                        setForm({
                          ...form,
                          scout_state: newState,
                          scout_district: firstDistrict,
                        });
                      }}
                      disabled={saving}
                    >
                      {Object.keys(scoutDistrictsByState).map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Daerah Pengakap</label>
                    <select
                      className="form-select"
                      value={form.scout_district}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          scout_district: event.target.value,
                        })
                      }
                      disabled={saving}
                    >
                      {districtOptions.map((districtName) => (
                        <option key={districtName} value={districtName}>
                          {districtName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Pemimpin Kumpulan</label>
                    <select
                      className="form-select"
                      value={form.leader_user_id}
                      onChange={(event) => {
                        const selectedLeader = leaders.find(
                          (leader) => leader.id === event.target.value
                        );

                        setForm({
                          ...form,
                          leader_user_id: event.target.value,
                          leader_name: selectedLeader?.full_name || "",
                        });
                      }}
                      disabled={saving}
                    >
                      <option value="">Pilih Pemimpin Kumpulan</option>

                      {leaders.map((leader) => (
                        <option key={leader.id} value={leader.id}>
                          {leader.full_name}
                          {leader.email ? ` (${leader.email})` : ""}
                        </option>
                      ))}
                    </select>

                    {leaders.length === 0 && (
                      <small className="text-muted">
                        Tiada Pemimpin Kumpulan aktif dalam daerah ini.
                      </small>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                      disabled={saving}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveGroup}
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Nyahaktif Kumpulan
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeactivateModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktifkan kumpulan ini?
                </p>
                <strong>{group.group_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Rekod tidak dipadam. Status kumpulan akan ditukar kepada Tidak
                  Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowDeactivateModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateGroup}
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