import { logout } from "../authService";

const Logout = () => {
  const handleLogout = async () => {
    await logout();
    alert("Logged out!");
  };

  return <button onClick={handleLogout}>Logout</button>;
};

export default Logout;
