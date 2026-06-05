import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

type StateRow = {
  id: string;
  state_name?: string | null;
  name?: string | null;
  state?: string | null;
  status?: string | null;
};

type DistrictRow = {
  id: string;
  state_id: string;
  district_name: string | null;
  district_code: string | null;
  status: string | null;
};

type DistrictEnvironmentRow = {
  id: string;
  state_id: string;
  district_id: string;
  status: string | null;
  deleted_at: string | null;
};

type ApplicationStatus = "Pending" | "Approved" | "Rejected" | "More Info";

function getStateDisplayName(state: StateRow) {
  return state.state_name || state.name || state.state || "-";
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  const digits = normalizePhone(value);

  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function isActiveStatus(value?: string | null) {
  const status = String(value || "Aktif").toLowerCase();

  return (
    status === "aktif" ||
    status === "active" ||
    status === "" ||
    status === "null"
  );
}

export default function RegisterDistrictPage() {
  const navigate = useNavigate();

  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [registeredEnvironments, setRegisteredEnvironments] = useState<
    DistrictEnvironmentRow[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    applicant_name: "",
    email: "",
    phone: "",
    password: "",
    state_id: "",
    state: "",
    district_id: "",
    district: "",
    position: "Pesuruhjaya Daerah",
    organization: "",
    agree: false,
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  async function loadMasterData() {
    setLoadingMasterData(true);

    try {
      const [statesResult, districtsResult, environmentsResult] =
        await Promise.all([
          supabase.from("states").select("*"),

          supabase
            .from("districts")
            .select("id, state_id, district_name, district_code, status")
            .order("district_name", { ascending: true }),

          supabase
            .from("district_environments")
            .select("id, state_id, district_id, status, deleted_at")
            .is("deleted_at", null),
        ]);

      if (statesResult.error) throw statesResult.error;
      if (districtsResult.error) throw districtsResult.error;
      if (environmentsResult.error) throw environmentsResult.error;

      const activeStates = (statesResult.data || []).filter((state: StateRow) =>
        isActiveStatus(state.status)
      );

      const activeDistricts = (districtsResult.data || []).filter(
        (district: DistrictRow) => isActiveStatus(district.status)
      );

      activeStates.sort((a: StateRow, b: StateRow) =>
        getStateDisplayName(a).localeCompare(getStateDisplayName(b))
      );

      activeDistricts.sort((a: DistrictRow, b: DistrictRow) =>
        normalizeText(a.district_name).localeCompare(
          normalizeText(b.district_name)
        )
      );

      setStates(activeStates);
      setDistricts(activeDistricts);
      setRegisteredEnvironments(environmentsResult.data || []);
    } catch (error: any) {
      console.error("Failed to load register master data:", error);
      alert(error?.message || "Gagal memuatkan negeri dan daerah.");
    } finally {
      setLoadingMasterData(false);
    }
  }

  const selectedState = useMemo(() => {
    return states.find((state) => state.id === form.state_id) || null;
  }, [states, form.state_id]);

  const selectedDistrict = useMemo(() => {
    return districts.find((district) => district.id === form.district_id) || null;
  }, [districts, form.district_id]);

  const districtOptions = useMemo(() => {
    if (!form.state_id) return [];

    return districts.filter((district) => district.state_id === form.state_id);
  }, [districts, form.state_id]);

  const selectedEnvironment = useMemo(() => {
    if (!form.state_id || !form.district_id) return null;

    return (
      registeredEnvironments.find(
        (environment) =>
          environment.state_id === form.state_id &&
          environment.district_id === form.district_id
      ) || null
    );
  }, [registeredEnvironments, form.state_id, form.district_id]);

  function handleStateChange(stateId: string) {
    const state = states.find((item) => item.id === stateId);

    setForm({
      ...form,
      state_id: stateId,
      state: state ? getStateDisplayName(state) : "",
      district_id: "",
      district: "",
    });
  }

  function handleDistrictChange(districtId: string) {
    const district = districts.find((item) => item.id === districtId);

    setForm({
      ...form,
      district_id: districtId,
      district: district?.district_name || "",
      organization: district?.district_name
        ? `Majlis Pengakap Daerah ${district.district_name}`
        : form.organization,
    });
  }

  function validateForm() {
    const applicantName = normalizeText(form.applicant_name);
    const email = normalizeEmail(form.email);
    const phone = normalizeText(form.phone);
    const password = normalizeText(form.password);
    const organization = normalizeText(form.organization);

    if (!applicantName) {
      alert("Sila isi nama penuh.");
      return false;
    }

    if (applicantName.length < 3) {
      alert("Nama penuh terlalu pendek.");
      return false;
    }

    if (!email) {
      alert("Sila isi e-mel.");
      return false;
    }

    if (!isValidEmail(email)) {
      alert("Format e-mel tidak sah.");
      return false;
    }

    if (!phone) {
      alert("Sila isi nombor telefon.");
      return false;
    }

    if (!isValidPhone(phone)) {
      alert("Nombor telefon tidak sah. Contoh: 012-345 6789.");
      return false;
    }

    if (!password) {
      alert("Sila isi kata laluan.");
      return false;
    }

    if (password.length < 6) {
      alert("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
      return false;
    }

    if (!form.state_id || !form.state) {
      alert("Sila pilih negeri.");
      return false;
    }

    if (!form.district_id || !form.district) {
      alert("Sila pilih daerah.");
      return false;
    }

    if (!organization) {
      alert("Sila isi nama majlis / organisasi.");
      return false;
    }

    if (selectedEnvironment) {
      alert(
        "Daerah ini telah berdaftar dalam sistem. Sila pilih daerah lain atau hubungi Super Admin."
      );
      return false;
    }

    if (!form.agree) {
      alert("Sila sahkan maklumat terlebih dahulu.");
      return false;
    }

    return true;
  }

  async function checkExistingApplication() {
    const { data, error } = await supabase
      .from("district_applications")
      .select("id, status")
      .eq("email", normalizeEmail(form.email))
      .eq("district", form.district)
      .in("status", ["Pending", "Approved", "More Info"])
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async function checkExistingUser() {
    const { data, error } = await supabase
      .from("system_users")
      .select("id, email, status")
      .eq("email", normalizeEmail(form.email))
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async function createPendingUserIfNeeded() {
    try {
      const existingUser = await checkExistingUser();

      if (existingUser) return;

      const { error } = await supabase.from("system_users").insert({
        full_name: normalizeText(form.applicant_name),
        email: normalizeEmail(form.email),
        phone: normalizePhone(form.phone),
        role: "Pesuruhjaya Daerah",
        district: form.district,
        district_environment_id: null,
        status: "Tidak Aktif",
        password: form.password,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("Pending user create failed:", error.message);
      }
    } catch (error) {
      console.warn("Pending user create skipped:", error);
    }
  }

  async function createAuditLog(applicationId: string) {
    try {
      await supabase.from("audit_logs").insert({
        actor_name: normalizeText(form.applicant_name),
        actor_role: "Pemohon Daerah",
        action: "CREATE",
        module: "Permohonan Daerah",
        description: `Permohonan daerah baharu dihantar untuk ${form.district}, ${form.state}.`,
        record_id: applicationId,
        old_value: null,
        new_value: JSON.stringify({
          applicant_name: normalizeText(form.applicant_name),
          email: normalizeEmail(form.email),
          state: form.state,
          district: form.district,
          organization: normalizeText(form.organization),
          status: "Pending",
        }),
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Jangan block registration kalau audit log gagal.
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const existingApplication = await checkExistingApplication();

      if (existingApplication) {
        alert("Permohonan untuk email dan daerah ini sudah wujud.");
        setLoading(false);
        return;
      }

      const { data: insertedApplication, error } = await supabase
        .from("district_applications")
        .insert({
          applicant_name: normalizeText(form.applicant_name),
          email: normalizeEmail(form.email),
          phone: formatPhone(form.phone),
          state: form.state,
          district: form.district,
          organization: normalizeText(form.organization),
          status: "Pending" as ApplicationStatus,
          admin_note: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      await createPendingUserIfNeeded();
      await createAuditLog(insertedApplication.id);

      navigate("/pending-approval");
    } catch (error: any) {
      console.error("Register district failed:", error);
      alert(error?.message || "Gagal menghantar permohonan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-light min-vh-100 py-5">
      <div className="container">
        <Link to="/" className="text-success text-decoration-none">
          ← Kembali ke Home
        </Link>

        <div
          className="card border-0 shadow-sm mt-3 mx-auto rounded-4 overflow-hidden"
          style={{ maxWidth: "980px" }}
        >
          <div className="bg-success text-white p-4">
            <h3 className="fw-bold mb-1">Permohonan Daftar Daerah</h3>
            <p className="mb-0 opacity-75">
              Lengkapkan maklumat untuk memohon akses sebagai Pesuruhjaya Daerah.
            </p>
          </div>

          {loadingMasterData ? (
            <div className="card-body p-5 text-center">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">
                Memuatkan senarai negeri dan daerah...
              </p>
            </div>
          ) : (
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <Section number="1" title="Maklumat Peribadi" icon="bi-person">
                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh *</label>
                    <input
                      className="form-control"
                      placeholder="Contoh: Ahmad bin Abdullah"
                      value={form.applicant_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          applicant_name: event.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">E-mel *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="nama@email.com"
                      value={form.email}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email: event.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nombor Telefon *</label>
                    <input
                      className="form-control"
                      placeholder="012-345 6789"
                      maxLength={13}
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: formatPhone(event.target.value),
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kata Laluan *</label>
                    <div className="input-group">
                      <input
                        className="form-control"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 6 aksara"
                        value={form.password}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            password: event.target.value,
                          })
                        }
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        title={
                          showPassword
                            ? "Sembunyikan password"
                            : "Lihat password"
                        }
                      >
                        <i
                          className={`bi ${
                            showPassword ? "bi-eye-slash" : "bi-eye"
                          }`}
                        ></i>
                      </button>
                    </div>

                    <small className="text-muted">
                      Akaun akan aktif selepas permohonan diluluskan.
                    </small>
                  </div>
                </Section>

                <Section number="2" title="Maklumat Daerah" icon="bi-building">
                  <div className="col-md-6">
                    <label className="form-label">Negeri *</label>
                    <select
                      className="form-select"
                      value={form.state_id}
                      onChange={(event) => handleStateChange(event.target.value)}
                      disabled={loading}
                    >
                      <option value="">-- Pilih Negeri --</option>

                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {getStateDisplayName(state)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Daerah *</label>
                    <select
                      className="form-select"
                      value={form.district_id}
                      onChange={(event) =>
                        handleDistrictChange(event.target.value)
                      }
                      disabled={!form.state_id || loading}
                    >
                      <option value="">
                        {form.state_id
                          ? "Pilih Daerah"
                          : "-- Pilih Negeri dahulu --"}
                      </option>

                      {districtOptions.map((district) => {
                        const alreadyRegistered = registeredEnvironments.some(
                          (environment) =>
                            environment.state_id === form.state_id &&
                            environment.district_id === district.id
                        );

                        return (
                          <option
                            key={district.id}
                            value={district.id}
                            disabled={alreadyRegistered}
                          >
                            {district.district_name}
                            {alreadyRegistered ? " — Telah Berdaftar" : ""}
                          </option>
                        );
                      })}
                    </select>

                    {form.state_id && districtOptions.length === 0 && (
                      <small className="text-danger">
                        Tiada daerah aktif untuk negeri ini.
                      </small>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Jawatan Dipohon</label>
                    <input
                      className="form-control bg-light"
                      value={form.position}
                      readOnly
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Nama Majlis / Organisasi *
                    </label>
                    <input
                      className="form-control"
                      placeholder="Contoh: Majlis Pengakap Daerah Petaling"
                      value={form.organization}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          organization: event.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  {selectedState && selectedDistrict && (
                    <div className="col-12">
                      <div className="alert alert-light border rounded-4 mb-0">
                        <div className="fw-semibold mb-1">Daerah Dipilih</div>
                        <div className="small text-muted">
                          {getStateDisplayName(selectedState)} →{" "}
                          {selectedDistrict.district_name}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEnvironment && (
                    <div className="col-12">
                      <div className="alert alert-danger rounded-4 mb-0">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Daerah ini telah berdaftar dan mempunyai environment
                        aktif dalam sistem.
                      </div>
                    </div>
                  )}
                </Section>

                <div className="card border-0 bg-success-subtle rounded-4 mt-4">
                  <div className="card-body">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="agree"
                        checked={form.agree}
                        disabled={loading}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            agree: event.target.checked,
                          })
                        }
                      />

                      <label className="form-check-label" htmlFor="agree">
                        Saya mengesahkan bahawa semua maklumat yang diberikan
                        adalah benar.
                      </label>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info mt-4">
                  <i className="bi bi-info-circle me-2"></i>
                  Permohonan akan dihantar kepada Super Admin untuk semakan.
                  Daerah hanya akan dikira sebagai{" "}
                  <strong>Daerah Berdaftar</strong> selepas permohonan
                  diluluskan.
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Link to="/" className="btn btn-outline-secondary">
                    Batal
                  </Link>

                  <button
                    className="btn btn-success px-4"
                    type="submit"
                    disabled={loading || loadingMasterData}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Menghantar...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-1"></i>
                        Hantar Permohonan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4 mb-4">
      <div className="card-header bg-white p-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center"
            style={{ width: 42, height: 42 }}
          >
            <i className={`bi ${icon}`}></i>
          </div>

          <div>
            <div className="text-muted small">Langkah {number}</div>
            <h5 className="fw-bold mb-0">{title}</h5>
          </div>
        </div>
      </div>

      <div className="card-body p-4">
        <div className="row g-3">{children}</div>
      </div>
    </div>
  );
}