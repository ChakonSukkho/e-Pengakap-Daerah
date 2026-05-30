type StatCardProps = {
  title: string;
  value: string | number;
  icon: string;
  color?: "success" | "primary" | "warning" | "danger" | "info";
};

export default function StatCard({
  title,
  value,
  icon,
  color = "success",
}: StatCardProps) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body d-flex justify-content-between align-items-start">
        <div>
          <div className="text-muted small text-uppercase fw-semibold">
            {title}
          </div>
          <h2 className="fw-bold mt-2 mb-0">{value}</h2>
        </div>

        <div className={`bg-${color}-subtle text-${color} rounded-3 p-3`}>
          <i className={`bi ${icon} fs-4`}></i>
        </div>
      </div>
    </div>
  );
}