import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function BackButton({ fallback = "/dashboard", label = "Back" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => {
    if (location.key === "default") navigate(fallback, { replace: true });
    else navigate(-1);
  };

  return <button type="button" onClick={goBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={16} />{label}</button>;
}
