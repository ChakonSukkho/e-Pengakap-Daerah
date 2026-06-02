import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

export default function RegisterDistrictPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    applicant_name: "",
    email: "",
    phone: "",
    password: "",
    state: "",
    district: "",
    position: "",
    organization: "",
    agree: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.applicant_name ||
      !form.email ||
      !form.phone ||
      !form.password ||
      !form.state ||
      !form.district ||
      !form.organization
    ) {
      alert("Sila lengkapkan semua maklumat wajib.");
      return;
    }

    if (!documentFile) {
      alert("Sila muat naik dokumen sokongan.");
      return;
    }

    if (!form.agree) {
      alert("Sila sahkan maklumat terlebih dahulu.");
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from("district_applications")
      .select("id")
      .eq("email", form.email)
      .eq("district", form.district)
      .in("status", ["Pending", "Approved"])
      .maybeSingle();

    if (existing) {
      alert("Permohonan untuk email dan daerah ini sudah wujud.");
      setLoading(false);
      return;
    }

    const fileExt = documentFile.name.split(".").pop();
    const fileName = `${Date.now()}-${form.email.replace(/[^a-zA-Z0-9]/g, "_")}.${fileExt}`;
    const filePath = `applications/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("district-documents")
      .upload(filePath, documentFile);

    if (uploadError) {
      alert(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("district-documents")
      .getPublicUrl(filePath);

    const documentUrl = publicUrlData.publicUrl;

    const { error } = await supabase.from("district_applications").insert({
      applicant_name: form.applicant_name,
      email: form.email,
      phone: form.phone,
      state: form.state,
      district: form.district,
      organization: form.organization,
      status: "Pending",
      admin_note: null,
      document_url: documentUrl,
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

        <div className="card border-0 shadow-sm mt-3 mx-auto" style={{ maxWidth: "900px" }}>
          <div className="card-body p-4">
            <h3 className="fw-bold">Daftar Pesuruhjaya Daerah</h3>
            <p className="text-muted">Lengkapkan maklumat untuk memohon akses daerah.</p>

            <form onSubmit={handleSubmit}>
              <h5 className="mt-4">Maklumat Peribadi</h5>

              <div className="row g-3">
                <div className="col-md-6">
                  <input
                    className="form-control"
                    placeholder="Nama Penuh"
                    value={form.applicant_name}
                    onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="E-mel"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <input
                    className="form-control"
                    placeholder="Nombor Telefon"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <input
                    className="form-control"
                    type="password"
                    placeholder="Kata Laluan"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <h5 className="mt-4">Maklumat Daerah</h5>

              <div className="row g-3">
                <div className="col-md-6">
                  <select
                    className="form-select"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  >
                    <option value="">Pilih Negeri</option>
                    <option>Selangor</option>
                    <option>Terengganu</option>
                    <option>Kelantan</option>
                    <option>Johor</option>
                    <option>Kedah</option>
                    <option>WP Kuala Lumpur</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <select
                    className="form-select"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                  >
                    <option value="">Pilih Daerah</option>
                    <option>Petaling</option>
                    <option>Gombak</option>
                    <option>Kuala Terengganu</option>
                    <option>Tumpat</option>
                    <option>Kota Bharu</option>
                    <option>Setiawangsa</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <input
                    className="form-control"
                    placeholder="Jawatan"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <input
                    className="form-control"
                    placeholder="Nama Majlis / Organisasi Daerah"
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  />
                </div>
              </div>

              <h5 className="mt-4">Dokumen Sokongan</h5>
              <input
                className="form-control"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />

              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="agree"
                  checked={form.agree}
                  onChange={(e) => setForm({ ...form, agree: e.target.checked })}
                />

                <label className="form-check-label" htmlFor="agree">
                  Saya mengesahkan bahawa maklumat yang diberikan adalah benar.
                </label>
              </div>

              <div className="alert alert-info mt-4">
                Permohonan akan dihantar kepada Super Admin untuk semakan.
              </div>

              <button className="btn btn-success" type="submit" disabled={loading}>
                {loading ? "Menghantar..." : "Hantar Permohonan"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}