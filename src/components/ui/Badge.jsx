const variants = {
    ACTIVE:      "bg-emerald-50 text-emerald-700 border border-emerald-100",
    INACTIVE:    "bg-gray-50 text-gray-500 border border-gray-100",
    GRADUATED:   "bg-blue-50 text-blue-600 border border-blue-100",
    TRANSFERRED: "bg-amber-50 text-amber-700 border border-amber-100",
    SUSPENDED:   "bg-red-50 text-red-600 border border-red-100",
    MALE:        "bg-sky-50 text-sky-600 border border-sky-100",
    FEMALE:      "bg-pink-50 text-pink-600 border border-pink-100",
  };
  
  const labels = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    GRADUATED: "Graduated",
    TRANSFERRED: "Transferred",
    SUSPENDED: "Suspended",
    MALE: "Male",
    FEMALE: "Female",
  };
  
  export default function Badge({ status, custom }) {
    const cls = variants[status] || "bg-gray-50 text-gray-500 border border-gray-100";
    const text = labels[status] || status;
    return (
      <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${cls} ${custom || ""}`}>
        {text}
      </span>
    );
  }