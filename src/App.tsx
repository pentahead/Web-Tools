import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import ImageToSvg from './pages/tools/ImageToSvg';
import ImageToPdf from './pages/tools/ImageToPdf';
import PdfToWord from './pages/tools/PdfToWord';
import RemoveBackground from './pages/tools/RemoveBackground';
import CompressPdf from './pages/tools/CompressPdf';
import MergePdf from './pages/tools/MergePdf';
import OrganizePdf from './pages/tools/OrganizePdf';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="tools/image-to-svg" element={<ImageToSvg />} />
          <Route path="tools/image-to-pdf" element={<ImageToPdf />} />
          <Route path="tools/remove-background" element={<RemoveBackground />} />
          <Route path="tools/pdf-to-word" element={<PdfToWord />} />
          <Route path="tools/compress-pdf" element={<CompressPdf />} />
          <Route path="tools/merge-pdf" element={<MergePdf />} />
          <Route path="tools/organize-pdf" element={<OrganizePdf />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
