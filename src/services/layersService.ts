const API_URL = process.env.REACT_APP_BACKEND_URL;

export const fetchJson = async (file: string) => {
  const response = await fetch(`${API_URL}/layer/${file}`);
  if (!response.ok) {
    throw new Error(`Error fetching ${file}: ${response.statusText}`);
  }
  return response.json();
};
