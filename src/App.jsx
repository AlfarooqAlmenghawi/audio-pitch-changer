import { useState } from "react";
import Header from "./components/Header/Header";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import PitchChanger from "./components/PitchChanger/PitchChanger";

function App() {
  return (
    <>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<PitchChanger />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
