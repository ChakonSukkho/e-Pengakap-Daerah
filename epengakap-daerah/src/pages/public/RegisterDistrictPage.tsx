import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

const districtData: Record<string, string[]> = {
  "Johor": [
    "Batu Pahat",
    "Johor Bahru",
    "Kluang",
    "Kota Tinggi",
    "Kulai",
    "Mersing",
    "Muar",
    "Pontian",
    "Segamat",
    "Tangkak"
  ],

  "Kedah": [
    "Baling",
    "Bandar Baharu",
    "Kota Setar",
    "Kuala Muda",
    "Kubang Pasu",
    "Kulim",
    "Langkawi",
    "Padang Terap",
    "Pendang",
    "Pokok Sena",
    "Sik",
    "Yan"
  ],

  "Kelantan": [
    "Bachok",
    "Gua Musang",
    "Jeli",
    "Kota Bharu",
    "Kuala Krai",
    "Machang",
    "Pasir Mas",
    "Pasir Puteh",
    "Tanah Merah",
    "Tumpat"
  ],

  "Melaka": [
    "Alor Gajah",
    "Jasin",
    "Melaka Tengah"
  ],

  "Negeri Sembilan": [
    "Jelebu",
    "Jempol",
    "Kuala Pilah",
    "Port Dickson",
    "Rembau",
    "Seremban",
    "Tampin"
  ],

  "Pahang": [
    "Bentong",
    "Bera",
    "Cameron Highlands",
    "Jerantut",
    "Kuantan",
    "Lipis",
    "Maran",
    "Pekan",
    "Raub",
    "Rompin",
    "Temerloh"
  ],

  "Pulau Pinang": [
    "Barat Daya",
    "Timur Laut",
    "Seberang Perai Utara",
    "Seberang Perai Tengah",
    "Seberang Perai Selatan"
  ],

  "Perak": [
    "Bagan Datuk",
    "Batang Padang",
    "Hilir Perak",
    "Hulu Perak",
    "Kampar",
    "Kerian",
    "Kinta",
    "Kuala Kangsar",
    "Larut, Matang dan Selama",
    "Manjung",
    "Muallim",
    "Perak Tengah"
  ],

  "Perlis": [
    "Perlis"
  ],

  "Selangor": [
    "Gombak",
    "Hulu Langat",
    "Hulu Selangor",
    "Klang",
    "Kuala Langat",
    "Kuala Selangor",
    "Petaling",
    "Sabak Bernam",
    "Sepang"
  ],

  "Terengganu": [
    "Besut",
    "Dungun",
    "Hulu Terengganu",
    "Kemaman",
    "Kuala Nerus",
    "Kuala Terengganu",
    "Marang",
    "Setiu"
  ],

  "Sabah": [
    "Beaufort",
    "Beluran",
    "Kalabakan",
    "Keningau",
    "Kinabatangan",
    "Kota Belud",
    "Kota Kinabalu",
    "Kota Marudu",
    "Kuala Penyu",
    "Kudat",
    "Kunak",
    "Lahad Datu",
    "Membakut",
    "Nabawan",
    "Paitan",
    "Papar",
    "Penampang",
    "Pitas",
    "Putatan",
    "Ranau",
    "Sandakan",
    "Semporna",
    "Sipitang",
    "Sook",
    "Tambunan",
    "Tawau",
    "Telupid",
    "Tenom",
    "Tongod",
    "Tuaran"
  ],

  "Sarawak": [
    "Asajaya",
    "Bau",
    "Belaga",
    "Beluru",
    "Betong",
    "Bintulu",
    "Bukit Mabong",
    "Dalat",
    "Daro",
    "Gedong",
    "Julau",
    "Kabong",
    "Kapit",
    "Kuching",
    "Lawas",
    "Limbang",
    "Lubok Antu",
    "Lundu",
    "Marudi",
    "Matu",
    "Meradong",
    "Miri",
    "Mukah",
    "Pakan",
    "Pusa",
    "Samarahan",
    "Saratok",
    "Sarikei",
    "Sebauh",
    "Sebuyau",
    "Serian",
    "Simunjan",
    "Song",
    "Sri Aman",
    "Subis",
    "Tanjung Manis",
    "Tatau",
    "Tebedu",
    "Telang Usan"
  ],

  "W.P. Kuala Lumpur": [
    "Kuala Lumpur"
  ],

  "W.P. Putrajaya": [
    "Putrajaya"
  ],

  "W.P. Labuan": [
    "Labuan"
  ]
};

export default function RegisterDistrictPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    applicant_name: "",
    email: "",
    phone: "",
    password: "",
    state: "",
    district: "",
    position: "Pesuruhjaya Daerah",
    organization: "",
    agree: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.applicant_name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password.trim() ||
      !form.state ||
      !form.district ||
      !form.organization.trim()
    ) {
      alert("Sila lengkapkan semua maklumat wajib.");
      return;
    }

    if (!form.agree) {
      alert("Sila sahkan maklumat terlebih dahulu.");
      return;
    }

    setLoading(true);

    const { data: existing, error: checkError } = await supabase
      .from("district_applications")
      .select("id")
      .eq("email", form.email)
      .eq("district", form.district)
      .in("status", ["Pending", "Approved"])
      .maybeSingle();

    if (checkError) {
      alert(checkError.message);
      setLoading(false);
      return;
    }

    if (existing) {
      alert("Permohonan untuk email dan daerah ini sudah wujud.");
      setLoading(false);
      return;
    }

    let documentUrl = "";

    if (documentFile) {
      const bucketName = "district-documents";
      const fileExt = documentFile.name.split(".").pop();
      const safeEmail = form.email.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `${Date.now()}-${safeEmail}.${fileExt}`;
      const filePath = `applications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile);

      if (uploadError) {
        alert(
          uploadError.message === "Bucket not found"
            ? `Storage bucket "${bucketName}" tidak wujud. Create bucket ini di Supabase Storage dahulu.`
            : uploadError.message
        );
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      documentUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("district_applications").insert({
      applicant_name: form.applicant_name,
      email: form.email,
      phone: form.phone,
      state: form.state,
      district: form.district,
      organization: form.organization,
      status: "Pending",
      admin_note: null,
      document_url: documentUrl || null,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/pending-approval");
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

          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <Section number="1" title="Maklumat Peribadi" icon="bi-person">
                <div className="col-md-6">
                  <label className="form-label">Nama Penuh *</label>
                  <input
                    className="form-control"
                    placeholder="Contoh: Ahmad bin Abdullah"
                    value={form.applicant_name}
                    onChange={(e) =>
                      setForm({ ...form, applicant_name: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">E-mel *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Nombor Telefon *</label>
                  <input
                    className="form-control"
                    placeholder="0123456789"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Kata Laluan *</label>
                  <div className="input-group">
                    <input
                      className="form-control"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan kata laluan"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                </div>
              </Section>

              <Section number="2" title="Maklumat Daerah" icon="bi-building">
                <div className="col-md-6">
                  <label className="form-label">Negeri *</label>
                  <select
                    className="form-select"
                    value={form.state}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        state: e.target.value,
                        district: "",
                      })
                    }
                  >
                    <option value="">-- Pilih Negeri --</option>
                  
                    {Object.keys(districtData).map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Daerah *</label>
                  <select
                    className="form-select"
                    value={form.district}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        district: e.target.value,
                      })
                    }
                    disabled={!form.state}
                  >
                    <option value="">
                      {form.state ? "Pilih Daerah" : "-- Pilih Negeri dahulu --"}
                    </option>
                  
                    {form.state &&
                      districtData[form.state]?.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                  </select>
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
                  <label className="form-label">Nama Majlis / Organisasi *</label>
                  <input
                    className="form-control"
                    placeholder="Contoh: Majlis Pengakap Daerah Petaling"
                    value={form.organization}
                    onChange={(e) =>
                      setForm({ ...form, organization: e.target.value })
                    }
                  />
                </div>
              </Section>

              <Section number="3" title="Dokumen Sokongan" icon="bi-file-earmark-arrow-up">
                <div className="col-12">
                  <label className="form-label">Muat Naik Dokumen</label>
                  <div className="border border-2 border-dashed rounded-4 p-4 text-center bg-light">
                    <i className="bi bi-cloud-arrow-up fs-1 text-success"></i>
                    <p className="fw-semibold mb-1 mt-2">
                      {documentFile ? documentFile.name : "Pilih dokumen sokongan"}
                    </p>
                    <p className="text-muted small mb-3">
                      PDF, PNG, JPG atau JPEG. Dokumen optional, tapi digalakkan.
                    </p>

                    <input
                      className="form-control"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) =>
                        setDocumentFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                </div>
              </Section>

              <div className="card border-0 bg-success-subtle rounded-4 mt-4">
                <div className="card-body">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="agree"
                      checked={form.agree}
                      onChange={(e) =>
                        setForm({ ...form, agree: e.target.checked })
                      }
                    />

                    <label className="form-check-label" htmlFor="agree">
                      Saya mengesahkan bahawa semua maklumat yang diberikan adalah benar.
                    </label>
                  </div>
                </div>
              </div>

              <div className="alert alert-info mt-4">
                <i className="bi bi-info-circle me-2"></i>
                Permohonan akan dihantar kepada Super Admin untuk semakan.
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Link to="/" className="btn btn-outline-secondary">
                  Batal
                </Link>

                <button className="btn btn-success px-4" type="submit" disabled={loading}>
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
  children: React.ReactNode;
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