import AuthSectionThree from "@/components/ui/auth-section-3";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();

  return (
    <AuthSectionThree onSuccess={() => navigate("/dashboard")} />
  );
}
