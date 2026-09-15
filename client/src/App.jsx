// App.jsx

import { Outlet } from "react-router-dom";
import Header from "./components/Header/Header";
import GetHackAIWidget from "./components/AI/GetHackAIWidget";


// App — Root Layout Component


function App() {
  return (
    <>
      <Header />
      <Outlet />
      <GetHackAIWidget />
    </>
  );
}

export default App;