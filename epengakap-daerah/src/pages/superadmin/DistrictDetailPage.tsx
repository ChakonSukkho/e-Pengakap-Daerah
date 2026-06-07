import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type EnvironmentStatus = "active" | "Suspended" | "inactive";

type DistrictEnvironmentRaw = {
  id: string;
  state_id: string;
  district_id: string;
  district_commissioner_user_id: string;
  official_name: string | null;
  official_email: string | null;
  official_phone: string | null;
  office_address: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DistrictEnvironmentDetail = DistrictEnvironmentRaw & {
  state_name: string;
  district_name: string;
  commissioner_name: string;
  commissioner_email: string;
  total_members: number;
  total_groups: number;
  total_users: number;
};

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  group_name?: string | null;
  status: string | null;
};

type CommissionerOption = SystemUser & {
  assigned_environment_id?: string | null;
  assigned_district_name?: string | null;
  is_current?: boolean;
  is_available?: boolean;
};

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

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhone(value: string) {
  const digits = normalizePhone(value);

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

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeStatus(value?: string | null) {
  return String(value || "active").trim().toLowerCase();
}

function isActiveStatus(value?: string | null) {
  const status = normalizeStatus(value);
  return status === "active" || status === "aktif";
}

function isSuspendedStatus(value?: string | null) {
  const status = normalizeStatus(value);
  return status === "suspended" || status === "digantung";
}

function isInactiveOnlyStatus(value?: string | null) {
  const status = normalizeStatus(value);
  return status === "inactive" || status === "tidak aktif" || status === "disabled";
}

function isInactiveStatus(value?: string | null) {
  return isSuspendedStatus(value) || isInactiveOnlyStatus(value);
}

function getCanonicalEnvironmentStatus(
  value?: string | null
): EnvironmentStatus {
  if (isSuspendedStatus(value)) return "Suspended";
  if (isInactiveOnlyStatus(value)) return "inactive";
  return "active";
}

function getStatusLabel(status: EnvironmentStatus) {
  if (status === "active") return "Aktif";
  if (status === "Suspended") return "Digantung";
  return "Tidak Aktif";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

  if (isSuspendedStatus(statusValue)) {
    return (
      <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-3 py-2">
        Digantung
      </span>
    );
  }

  if (isInactiveOnlyStatus(statusValue)) {
    return (
      <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
        Tidak Aktif
      </span>
    );
  }

  return (
    <span className="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2">
      {statusValue || "-"}
    </span>
  );
}

export default function DistrictDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [environment, setEnvironment] =
    useState<DistrictEnvironmentDetail | null>(null);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [commissioners, setCommissioners] = useState<CommissionerOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [pendingStatus, setPendingStatus] =
    useState<EnvironmentStatus>("active");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommissionerModal, setShowCommissionerModal] = useState(false);

  const [editForm, setEditForm] = useState({
    official_name: "",
    official_email: "",
    official_phone: "",
    office_address: "",
  });

  const [selectedCommissionerId, setSelectedCommissionerId] = useState("");

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addAuditLog(
    action: string,
    description: string,
    recordId?: string | null,
    oldValue?: unknown,
    newValue?: unknown,
    districtEnvironmentId?: string | null
  ) {
    try {
      const user = getCurrentUser();

      await supabase.from("audit_logs").insert({
        actor_name: user.full_name || "Super Admin",
        actor_role: user.role || "Super Admin",
        action,
        module: "Pengurusan Daerah",
        description,
        user_id: user.id || null,
        district_environment_id: districtEnvironmentId || null,
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

  async function countRows(tableName: string, environmentId: string) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("district_environment_id", environmentId)
        .is("deleted_at", null);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  async function fetchDetail() {
    if (!id) return;

    setLoading(true);

    try {
      const { data: envData, error: envError } = await supabase
        .from("district_environments")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle<DistrictEnvironmentRaw>();

      if (envError) throw envError;

      if (!envData) {
        setEnvironment(null);
        setLoading(false);
        return;
      }

      const [
        stateResult,
        districtResult,
        commissionerResult,
        usersResult,
        allCommissionersResult,
        allEnvironmentsResult,
        allDistrictsResult,
      ] = await Promise.all([
        supabase
          .from("states")
          .select("*")
          .eq("id", envData.state_id)
          .maybeSingle(),

        supabase
          .from("districts")
          .select("id, district_name, state_id")
          .eq("id", envData.district_id)
          .maybeSingle(),

        supabase
          .from("system_users")
          .select("*")
          .eq("id", envData.district_commissioner_user_id)
          .maybeSingle<SystemUser>(),

        supabase
          .from("system_users")
          .select("*")
          .eq("district_environment_id", envData.id)
          .order("role", { ascending: true }),

        supabase
          .from("system_users")
          .select("*")
          .eq("role", "Pesuruhjaya Daerah")
          .order("full_name", { ascending: true }),

        supabase
          .from("district_environments")
          .select("id, district_id, district_commissioner_user_id, deleted_at")
          .is("deleted_at", null),

        supabase.from("districts").select("id, district_name"),
      ]);

      if (stateResult.error) throw stateResult.error;
      if (districtResult.error) throw districtResult.error;
      if (commissionerResult.error) throw commissionerResult.error;
      if (usersResult.error) throw usersResult.error;
      if (allCommissionersResult.error) throw allCommissionersResult.error;
      if (allEnvironmentsResult.error) throw allEnvironmentsResult.error;
      if (allDistrictsResult.error) throw allDistrictsResult.error;

      const stateName =
        stateResult.data?.state_name ||
        stateResult.data?.name ||
        stateResult.data?.state ||
        "-";

      const districtName = districtResult.data?.district_name || "-";

      const [memberCount, groupCount] = await Promise.all([
        countRows("members", envData.id),
        countRows("groups", envData.id),
      ]);

      const districtNameMap = new Map<string, string>();

      (allDistrictsResult.data || []).forEach((district: any) => {
        districtNameMap.set(district.id, district.district_name || "-");
      });

      const commissionerOptions: CommissionerOption[] =
        (allCommissionersResult.data || []).map((user: SystemUser) => {
          const assignedEnvironment = (allEnvironmentsResult.data || []).find(
            (env: any) => env.district_commissioner_user_id === user.id
          );

          const assignedDistrictName = assignedEnvironment
            ? districtNameMap.get(assignedEnvironment.district_id) || "-"
            : null;

          const isCurrent = user.id === envData.district_commissioner_user_id;
          const isAvailable = !assignedEnvironment || isCurrent;

          return {
            ...user,
            assigned_environment_id: assignedEnvironment?.id || null,
            assigned_district_name: assignedDistrictName,
            is_current: isCurrent,
            is_available: isAvailable,
          };
        });

      setEnvironment({
        ...envData,
        state_name: stateName,
        district_name: districtName,
        commissioner_name: commissionerResult.data?.full_name || "-",
        commissioner_email: commissionerResult.data?.email || "-",
        total_members: memberCount,
        total_groups: groupCount,
        total_users: usersResult.data?.length || 0,
      });

      setPendingStatus(getCanonicalEnvironmentStatus(envData.status));
      setUsers(usersResult.data || []);
      setCommissioners(commissionerOptions);
      setSelectedCommissionerId(envData.district_commissioner_user_id);
    } catch (error: any) {
      console.error("Failed to fetch district detail:", error);
      alert(error?.message || "Gagal mendapatkan maklumat daerah.");
    } finally {
      setLoading(false);
    }
  }

  function openEditModal() {
    if (!environment) return;

    setEditForm({
      official_name: environment.official_name || "",
      official_email: environment.official_email || "",
      official_phone: formatPhone(environment.official_phone || ""),
      office_address: environment.office_address || "",
    });

    setShowEditModal(true);
  }

  async function saveDistrictInfo() {
    if (!environment) return;

    const officialName = normalizeText(editForm.official_name);
    const officialEmail = normalizeEmail(editForm.official_email);
    const officialPhone = normalizePhone(editForm.official_phone);
    const officeAddress = normalizeText(editForm.office_address);

    if (!officialName) {
      alert("Sila isi nama rasmi daerah.");
      return;
    }

    if (officialEmail && !isValidEmail(officialEmail)) {
      alert("Format email rasmi tidak sah.");
      return;
    }

    setProcessing(true);

    try {
      const payload = {
        official_name: officialName,
        official_email: officialEmail || null,
        official_phone: officialPhone || null,
        office_address: officeAddress || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("district_environments")
        .update(payload)
        .eq("id", environment.id);

      if (error) throw error;

      try {
        const { data: existingSetting } = await supabase
          .from("district_settings")
          .select("id")
          .eq("district_environment_id", environment.id)
          .maybeSingle();

        const settingsPayload = {
          district_environment_id: environment.id,
          state: environment.state_name,
          district: environment.district_name,
          official_name: officialName,
          email: officialEmail || null,
          phone: officialPhone || null,
          address: officeAddress || null,
          status: isActiveStatus(environment.status) ? "Active" : "Inactive",
          updated_at: new Date().toISOString(),
        };

        if (existingSetting?.id) {
          await supabase
            .from("district_settings")
            .update(settingsPayload)
            .eq("id", existingSetting.id);
        } else {
          await supabase.from("district_settings").insert({
            ...settingsPayload,
            created_at: new Date().toISOString(),
          });
        }
      } catch (settingsError) {
        console.warn("District settings sync skipped:", settingsError);
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini maklumat rasmi daerah ${environment.district_name}.`,
        environment.id,
        {
          official_name: environment.official_name,
          official_email: environment.official_email,
          official_phone: environment.official_phone,
          office_address: environment.office_address,
        },
        payload,
        environment.id
      );

      setShowEditModal(false);
      await fetchDetail();

      alert("Maklumat daerah berjaya dikemaskini.");
    } catch (error: any) {
      alert(error?.message || "Gagal mengemaskini maklumat daerah.");
    } finally {
      setProcessing(false);
    }
  }

  async function saveEnvironmentStatus() {
    if (!environment) return;

    const currentStatus = getCanonicalEnvironmentStatus(environment.status);

    if (pendingStatus === currentStatus) {
      alert("Tiada perubahan status untuk disimpan.");
      return;
    }

    const label =
      pendingStatus === "active"
        ? "aktifkan"
        : pendingStatus === "Suspended"
        ? "gantung"
        : "nyahaktifkan";

    const confirmed = confirm(
      `Simpan perubahan status dan ${label} daerah ${environment.district_name}?`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("district_environments")
        .update({
          status: pendingStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", environment.id);

      if (error) throw error;

      await addAuditLog(
        pendingStatus === "active"
          ? "ACTIVATE"
          : pendingStatus === "Suspended"
          ? "SUSPEND"
          : "DEACTIVATE",
        `Kemaskini status environment daerah ${
          environment.district_name
        } kepada ${getStatusLabel(pendingStatus)}.`,
        environment.id,
        environment,
        { status: pendingStatus },
        environment.id
      );

      await fetchDetail();

      alert("Status environment berjaya disimpan.");
    } catch (error: any) {
      alert(error?.message || "Gagal mengemaskini status daerah.");
    } finally {
      setProcessing(false);
    }
  }

  async function assignCommissioner() {
    if (!environment) return;

    if (!selectedCommissionerId) {
      alert("Sila pilih Pesuruhjaya Daerah.");
      return;
    }

    const selectedCommissioner = commissioners.find(
      (user) => user.id === selectedCommissionerId
    );

    if (!selectedCommissioner) {
      alert("Pesuruhjaya Daerah tidak dijumpai.");
      return;
    }

    if (!selectedCommissioner.is_available) {
      alert(
        `Pesuruhjaya ini sudah pegang daerah ${selectedCommissioner.assigned_district_name}. Sila pilih pengguna lain.`
      );
      return;
    }

    const confirmed = confirm(
      `Tukar Pesuruhjaya Daerah ${environment.district_name} kepada ${
        selectedCommissioner.full_name || selectedCommissioner.email
      }?`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const { data: assignedElsewhere, error: assignedError } = await supabase
        .from("district_environments")
        .select("id")
        .eq("district_commissioner_user_id", selectedCommissionerId)
        .is("deleted_at", null)
        .neq("id", environment.id)
        .maybeSingle();

      if (assignedError) throw assignedError;

      if (assignedElsewhere) {
        alert(
          "Pesuruhjaya ini sudah assigned kepada daerah lain. Sila pilih pengguna lain."
        );
        setProcessing(false);
        return;
      }

      const { error: envError } = await supabase
        .from("district_environments")
        .update({
          district_commissioner_user_id: selectedCommissionerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", environment.id);

      if (envError) throw envError;

      await supabase
        .from("system_users")
        .update({
          district_environment_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("district_environment_id", environment.id)
        .eq("role", "Pesuruhjaya Daerah");

      const { error: userError } = await supabase
        .from("system_users")
        .update({
          district_environment_id: environment.id,
          district: environment.district_name,
          status: "Aktif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCommissionerId);

      if (userError) throw userError;

      await addAuditLog(
        "CHANGE_COMMISSIONER",
        `Tukar Pesuruhjaya Daerah ${environment.district_name} kepada ${
          selectedCommissioner.full_name || selectedCommissioner.email
        }.`,
        environment.id,
        environment,
        {
          district_commissioner_user_id: selectedCommissionerId,
          commissioner_name: selectedCommissioner.full_name,
          commissioner_email: selectedCommissioner.email,
        },
        environment.id
      );

      setShowCommissionerModal(false);
      await fetchDetail();
    } catch (error: any) {
      alert(error?.message || "Gagal menukar Pesuruhjaya Daerah.");
    } finally {
      setProcessing(false);
    }
  }

  const availableCommissioners = useMemo(() => {
    return commissioners.filter((user) => user.is_available);
  }, [commissioners]);

  const unavailableCommissioners = useMemo(() => {
    return commissioners.filter((user) => !user.is_available);
  }, [commissioners]);

  const hasStatusChange = environment
    ? pendingStatus !== getCanonicalEnvironmentStatus(environment.status)
    : false;

  if (loading) {
    return (
      <DashboardLayout role="superadmin">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">Memuatkan maklumat daerah...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!environment) {
    return (
      <DashboardLayout role="superadmin">
        <div className="alert alert-warning rounded-4">
          Maklumat daerah tidak dijumpai.
        </div>

        <button
          className="btn btn-outline-success"
          onClick={() => navigate("/superadmin/districts")}
        >
          ← Kembali ke Senarai Daerah
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="superadmin">
      <div className="mb-4">
        <Link
          to="/superadmin/districts"
          className="text-success text-decoration-none"
        >
          ← Kembali ke Senarai Daerah
        </Link>
      </div>

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">{environment.district_name}</h2>
          <p className="text-muted mb-0">
            {environment.state_name} •{" "}
            {environment.official_name || "District Environment"}
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          {getStatusBadge(environment.status)}

          <button
            className="btn btn-outline-success"
            onClick={fetchDetail}
            disabled={processing}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Jumlah Ahli"
          value={environment.total_members}
          icon="bi-people"
          color="primary"
        />

        <SummaryCard
          title="Jumlah Kumpulan"
          value={environment.total_groups}
          icon="bi-diagram-3"
          color="info"
        />

        <SummaryCard
          title="Pengguna Daerah"
          value={environment.total_users}
          icon="bi-person-badge"
          color="success"
        />
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-start gap-3">
              <div>
                <h5 className="fw-bold mb-1">Maklumat Daerah</h5>
                <p className="text-muted small mb-0">
                  Maklumat rasmi district environment.
                </p>
              </div>

              <button
                className="btn btn-sm btn-outline-success rounded-pill px-3"
                onClick={openEditModal}
                disabled={processing}
              >
                <i className="bi bi-pencil-square me-1"></i>
                Edit Maklumat
              </button>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <DetailItem label="Negeri" value={environment.state_name} />
                <DetailItem label="Daerah" value={environment.district_name} />
                <DetailItem
                  label="Nama Rasmi"
                  value={environment.official_name}
                />
                <DetailItem
                  label="Email Rasmi"
                  value={environment.official_email}
                />
                <DetailItem
                  label="Telefon Rasmi"
                  value={formatPhone(environment.official_phone || "") || "-"}
                />
                <DetailItem
                  label="Tarikh Diluluskan"
                  value={formatDateTime(environment.approved_at)}
                />

                <div className="col-12">
                  <div className="border rounded-4 p-3">
                    <small className="text-muted d-block mb-1">
                      Alamat Pejabat
                    </small>
                    <strong>{environment.office_address || "-"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-start gap-3">
              <div>
                <h5 className="fw-bold mb-1">Pesuruhjaya Daerah</h5>
                <p className="text-muted small mb-0">
                  Admin utama untuk environment daerah ini.
                </p>
              </div>

              <button
                className="btn btn-success btn-sm rounded-pill px-3"
                onClick={() => setShowCommissionerModal(true)}
                disabled={processing}
              >
                <i className="bi bi-person-gear me-1"></i>
                Tukar Pesuruhjaya
              </button>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 56, height: 56 }}
                >
                  {(environment.commissioner_name || "?")
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                <div>
                  <h6 className="fw-bold mb-1">
                    {environment.commissioner_name}
                  </h6>
                  <div className="text-muted small">
                    {environment.commissioner_email}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Pengguna Dalam Daerah</h5>
              <p className="text-muted small mb-0">
                Senarai pengguna yang assigned kepada environment ini.
              </p>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Kumpulan</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5 text-muted">
                        Tiada pengguna assigned.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3">
                          <div className="fw-semibold">
                            {user.full_name || "-"}
                          </div>
                          <small className="text-muted">
                            {user.email || "-"}
                          </small>
                        </td>

                        <td className="px-4 py-3">{user.role || "-"}</td>
                        <td className="px-4 py-3">{user.group_name || "-"}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`badge rounded-pill px-3 py-2 ${
                              user.status === "Aktif"
                                ? "bg-success-subtle text-success border border-success-subtle"
                                : "bg-danger-subtle text-danger border border-danger-subtle"
                            }`}
                          >
                            {user.status || "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Pengurusan Status</h5>
              <p className="text-muted small mb-0">
                Pilih status kemudian tekan simpan.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="mb-3">
                <small className="text-muted d-block mb-2">Status dipilih</small>
                <span
                  className={`badge rounded-pill px-3 py-2 ${
                    pendingStatus === "active"
                      ? "bg-success-subtle text-success border border-success-subtle"
                      : pendingStatus === "Suspended"
                      ? "bg-warning-subtle text-warning border border-warning-subtle"
                      : "bg-danger-subtle text-danger border border-danger-subtle"
                  }`}
                >
                  {getStatusLabel(pendingStatus)}
                </span>

                {hasStatusChange && (
                  <div className="small text-warning mt-2">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Ada perubahan belum disimpan.
                  </div>
                )}
              </div>

              <div className="d-grid gap-2">
                <button
                  type="button"
                  className={`btn ${
                    pendingStatus === "active"
                      ? "btn-success"
                      : "btn-outline-success"
                  }`}
                  onClick={() => setPendingStatus("active")}
                  disabled={processing}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Aktifkan Environment
                </button>

                <button
                  type="button"
                  className={`btn ${
                    pendingStatus === "Suspended"
                      ? "btn-warning text-dark"
                      : "btn-outline-warning"
                  }`}
                  onClick={() => setPendingStatus("Suspended")}
                  disabled={processing}
                >
                  <i className="bi bi-pause-circle me-1"></i>
                  Gantung Environment
                </button>

                <button
                  type="button"
                  className={`btn ${
                    pendingStatus === "inactive"
                      ? "btn-danger"
                      : "btn-outline-danger"
                  }`}
                  onClick={() => setPendingStatus("inactive")}
                  disabled={processing}
                >
                  <i className="bi bi-slash-circle me-1"></i>
                  Nyahaktifkan Environment
                </button>

                <hr />

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveEnvironmentStatus}
                  disabled={processing || !hasStatusChange}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-1"></i>
                      Simpan Status
                    </>
                  )}
                </button>
              </div>

              <div className="alert alert-light border rounded-4 small mt-3 mb-0">
                <i className="bi bi-info-circle me-1"></i>
                Pilih status dahulu, kemudian tekan{" "}
                <strong>Simpan Status</strong> untuk sahkan perubahan.
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Edit Maklumat Daerah</h5>
                  <small className="text-muted">
                    Daerah: {environment.district_name}
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                  disabled={processing}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nama Rasmi *</label>
                    <input
                      className="form-control"
                      value={editForm.official_name}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          official_name: event.target.value,
                        })
                      }
                      placeholder="Contoh: Majlis Pengakap Daerah Kulim"
                      disabled={processing}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email Rasmi</label>
                    <input
                      className="form-control"
                      value={editForm.official_email}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          official_email: event.target.value,
                        })
                      }
                      placeholder="contoh@email.com"
                      disabled={processing}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon Rasmi</label>
                    <input
                      className="form-control"
                      value={editForm.official_phone}
                      maxLength={13}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          official_phone: formatPhone(event.target.value),
                        })
                      }
                      placeholder="012-345 6789"
                      disabled={processing}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status Semasa</label>
                    <div className="form-control bg-light">
                      {getStatusLabel(
                        getCanonicalEnvironmentStatus(environment.status)
                      )}
                    </div>
                    <small className="text-muted">
                      Status environment dikawal di bahagian Pengurusan Status.
                    </small>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Alamat Pejabat</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={editForm.office_address}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          office_address: event.target.value,
                        })
                      }
                      placeholder="Masukkan alamat pejabat daerah..."
                      disabled={processing}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={processing}
                >
                  Batal
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveDistrictInfo}
                  disabled={processing}
                >
                  {processing ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCommissionerModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    Tukar Pesuruhjaya Daerah
                  </h5>
                  <small className="text-muted">
                    Daerah: {environment.district_name}
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => setShowCommissionerModal(false)}
                  disabled={processing}
                ></button>
              </div>

              <div className="modal-body">
                <div className="alert alert-info rounded-4">
                  <i className="bi bi-info-circle me-2"></i>
                  Hanya Pesuruhjaya yang belum assigned kepada daerah lain boleh
                  dipilih.
                </div>

                <label className="form-label">Pesuruhjaya tersedia</label>
                <select
                  className="form-select mb-3"
                  value={selectedCommissionerId}
                  onChange={(event) =>
                    setSelectedCommissionerId(event.target.value)
                  }
                  disabled={processing}
                >
                  <option value="">Pilih Pesuruhjaya</option>

                  {availableCommissioners.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} — {user.email}
                      {user.is_current ? " — Semasa" : ""}
                    </option>
                  ))}
                </select>

                {unavailableCommissioners.length > 0 && (
                  <>
                    <div className="fw-semibold small mb-2 text-muted">
                      Tidak tersedia
                    </div>

                    <div className="list-group">
                      {unavailableCommissioners.map((user) => (
                        <div
                          key={user.id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <div className="fw-semibold">
                              {user.full_name || "-"}
                            </div>
                            <small className="text-muted">{user.email}</small>
                          </div>

                          <span className="badge bg-light text-danger border">
                            Pegang {user.assigned_district_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCommissionerModal(false)}
                  disabled={processing}
                >
                  Batal
                </button>

                <button
                  className="btn btn-success"
                  onClick={assignCommissioner}
                  disabled={processing}
                >
                  {processing ? "Menyimpan..." : "Simpan Perubahan"}
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
    <div className="col-md-4">
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="col-md-6">
      <div className="border rounded-4 p-3 h-100">
        <small className="text-muted d-block mb-1">{label}</small>
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );
}