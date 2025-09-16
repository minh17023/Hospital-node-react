import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import BhyTFlow from "./pages/BhyTFlow";
import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/offline" element={<BhyTFlow />} />
      </Routes>
    </BrowserRouter>
  );
}
