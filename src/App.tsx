import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import ImageToSvg from './pages/tools/ImageToSvg';
import ImageToPdf from './pages/tools/ImageToPdf';
import PdfToWord from './pages/tools/PdfToWord';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="tools/image-to-svg" element={<ImageToSvg />} />
          <Route path="tools/image-to-pdf" element={<ImageToPdf />} />
          <Route path="tools/pdf-to-word" element={<PdfToWord />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
