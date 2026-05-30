import { useRef, useState } from "react";

export default function FileUploadCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files) return;

    setFiles(Array.from(event.target.files));
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">

        <h5 className="fw-bold mb-3">
          <i className="bi bi-cloud-upload me-2"></i>
          Muat Naik Fail
        </h5>

        <div
          className="border border-2 border-success border-opacity-25 rounded text-center p-5 bg-light"
          style={{
            cursor: "pointer",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="bi bi-cloud-arrow-up fs-1 text-success"></i>

          <h6 className="fw-bold mt-3">
            Klik untuk memilih fail
          </h6>

          <p className="text-muted mb-0">
            CSV, XLSX, PDF, JPG, PNG
          </p>
        </div>

        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {files.length > 0 && (
          <div className="mt-4">
            <h6 className="fw-semibold">
              Fail Dipilih
            </h6>

            <ul className="list-group">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <span>
                    <i className="bi bi-file-earmark me-2"></i>
                    {file.name}
                  </span>

                  <span className="badge bg-success">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}