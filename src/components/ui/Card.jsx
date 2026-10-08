export default function Card({ children, className = "", padding = true }) {
    return (
      <div className={`bg-white rounded-xl border border-gray-100 ${padding ? "p-5" : ""} ${className}`}>
        {children}
      </div>
    );
  }