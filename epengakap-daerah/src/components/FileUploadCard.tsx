import { useRef } from "react";

export default function FileUploadCard() {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body text-center p-5">

        <i className="bi bi-cloud-arrow-up fs-1 text-success"></i>

        <h5 className="fw-bold mt-3">
          Muat Naik Fail
        </h5>

        <p className="text-muted">
          Seret fail ke sini atau klik untuk memilih fail
        </p>

        <button
          className="btn btn-success"
          onClick={() => fileRef.current?.click()}
        >
          Pilih Fail
        </button>

        <input
          type="file"
          ref={fileRef}
          hidden
        />

        <div className="mt-3 text-muted small">
          Format disokong:
          CSV, XLSX, PDF, JPG, PNG
        </div>

      </div>
    </div>
  );
}