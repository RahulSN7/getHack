// App.jsx

import { Outlet } from "react-router-dom";
import Header from "./components/Header/Header";

// ---------------------------------------------------------------------------
// App — Root Layout Component
// ---------------------------------------------------------------------------

function App() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export default App;