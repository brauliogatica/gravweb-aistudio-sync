// useLoadDemoProject.ts
import { useNavigate } from "react-router-dom";

export function useLoadDemoProject() {
  const navigate = useNavigate();

  return () => {
    navigate("/particles");
  };
}
