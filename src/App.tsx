import { useState, useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import Preloader from "./components/Preloader";

function App() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [ready, setReady] = useState(false);

  const handlePreloaderFinish = () => {
    setReady(true);
  };

  if (!ready) {
    return <Preloader onFinish={handlePreloaderFinish} />;
  }

  return <AppRoutes />;
}

export default App;
