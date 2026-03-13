import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { Loader2, Check, X, Printer, ZoomIn, ZoomOut, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { InventoryItem } from '../types';

// Set up PDF.js worker - using the version from the imported package to ensure compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};

interface PdfCropperProps {
  item: InventoryItem;
  pdfUrl: string;
  onClose: () => void;
  onComplete: () => void;
  onPrintMarkAsSent?: () => void;
}

export const PdfCropper: React.FC<PdfCropperProps> = ({ item, pdfUrl, onClose, onComplete, onPrintMarkAsSent }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [hasDownloaded, setHasDownloaded] = useState(() => {
    return sessionStorage.getItem(`vinted_pdf_downloaded_${item.sku}`) === 'true';
  });
  const [step, setStep] = useState<'crop' | 'print' | 'validate'>('crop');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (hasDownloaded) {
      sessionStorage.setItem(`vinted_pdf_downloaded_${item.sku}`, 'true');
    } else {
      sessionStorage.removeItem(`vinted_pdf_downloaded_${item.sku}`);
    }
  }, [hasDownloaded, item.sku]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        let pdfData: Uint8Array;

        if (pdfUrl.startsWith('data:')) {
          const base64Data = pdfUrl.split(',')[1];
          pdfData = new Uint8Array(base64ToArrayBuffer(base64Data));
        } else {
          const response = await fetch(pdfUrl);
          const buffer = await response.arrayBuffer();
          pdfData = new Uint8Array(buffer);
        }

        const loadingTask = pdfjs.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1.0 });
        setPdfDimensions({ width: viewport.width, height: viewport.height });

        const displayScale = 2.0;
        const displayViewport = page.getViewport({ scale: displayScale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = displayViewport.height;
        canvas.width = displayViewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport: displayViewport } as any).promise;
          setImgSrc(canvas.toDataURL('image/jpeg', 0.8));
        }
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Erreur lors du chargement du PDF pour le rognage.");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  const handleGeneratePdf = async () => {
    if (!completedCrop || !imgRef.current) return;

    try {
      setIsProcessing(true);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }

      const image = imgRef.current;
      const scaleX = pdfDimensions.width / image.width;
      const scaleY = pdfDimensions.height / image.height;

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      let pdfBytes: Uint8Array;
      try {
        if (pdfUrl.startsWith('data:')) {
          const base64Data = pdfUrl.split(',')[1];
          pdfBytes = new Uint8Array(base64ToArrayBuffer(base64Data));
        } else {
          const response = await fetch(pdfUrl);
          const buffer = await response.arrayBuffer();
          pdfBytes = new Uint8Array(buffer);
        }
      } catch (fetchError) {
        console.error("Fetch PDF error:", fetchError);
        throw new Error("Impossible de récupérer le fichier PDF original.");
      }

      const srcDoc = await PDFDocument.load(pdfBytes);
      const [srcPage] = srcDoc.getPages();

      const targetWidth = 288; // 4 inches
      const targetHeight = 432; // 6 inches
      
      const pdfDoc = await PDFDocument.create();
      const newPage = pdfDoc.addPage([targetWidth, targetHeight]);

      const embeddedPage = await pdfDoc.embedPage(srcPage);

      const scaleFactor = Math.min(targetWidth / cropWidth, targetHeight / cropHeight);
      
      const xOffset = (targetWidth - (cropWidth * scaleFactor)) / 2;
      const yOffset = (targetHeight - (cropHeight * scaleFactor)) / 2;
      
      const srcCropBottomLeftY = pdfDimensions.height - (cropY + cropHeight);
      
      newPage.drawPage(embeddedPage, {
        x: xOffset - (cropX * scaleFactor),
        y: yOffset - (srcCropBottomLeftY * scaleFactor),
        width: pdfDimensions.width * scaleFactor,
        height: pdfDimensions.height * scaleFactor,
      });

      newPage.drawText(`#${item.sku}`, {
        x: 5,
        y: 5,
        size: 8,
        color: rgb(0, 0, 0),
      });

      const modifiedPdfBytes = await pdfDoc.save();
      const fileName = `etiquette_${item.sku}_4x6.pdf`;
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setPdfBlobUrl(blobUrl);
      setPdfFileName(fileName);
      setStep('print');

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erreur: " + (error instanceof Error ? error.message : "Une erreur est survenue"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareOrDownload = () => {
    if (!pdfBlobUrl) return;

    try {
      // On iOS, opening the PDF in a new tab is the most reliable way 
      // to get the FULL system share menu (including Labelife) 
      // via the native browser PDF viewer.
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setHasDownloaded(true);
      setStep('validate');
    } catch (error) {
      console.error("Download error:", error);
      // Fallback
      window.open(pdfBlobUrl, '_blank');
      setHasDownloaded(true);
      setStep('validate');
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspect = 2 / 3;
    
    let cropHeight = height * 0.8;
    let cropWidth = cropHeight * aspect;

    if (cropWidth > width * 0.8) {
      cropWidth = width * 0.8;
      cropHeight = cropWidth / aspect;
    }

    const initialCrop: Crop = {
      unit: 'px',
      width: cropWidth,
      height: cropHeight,
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
    };

    setCrop(initialCrop);
    setCompletedCrop({
      unit: 'px',
      width: cropWidth,
      height: cropHeight,
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
    });
  };

  const steps = [
    { id: 'crop', label: 'Rognage', icon: <ZoomIn size={16} /> },
    { id: 'print', label: 'Impression', icon: <Printer size={16} /> },
    { id: 'validate', label: 'Validation', icon: <CheckCircle2 size={16} /> }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header matching ItemDetails */}
      <div className="px-1 flex items-center justify-between mb-4 relative min-h-[48px]">
        <button 
          onClick={() => {
            if (step === 'print') setStep('crop');
            else if (step === 'validate') setStep('print');
            else onClose();
          }} 
          className="w-8 h-8 bg-white border border-zinc-200 text-zinc-600 rounded-full shadow-sm flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all z-10"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="absolute left-0 right-0 flex flex-col items-center pointer-events-none">
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 'crop' && "Rogner l'étiquette"}
            {step === 'print' && "Aperçu avant impression"}
            {step === 'validate' && "Validation"}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 z-10">
          {step === 'crop' && (
            <button 
              onClick={handleGeneratePdf}
              disabled={isProcessing}
              className="w-8 h-8 bg-blue-600 text-white rounded-full shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center bg-white rounded-full p-1 border border-zinc-100 shadow-sm">
          {steps.map((s, idx) => {
            const isActive = s.id === step;
            const isCompleted = steps.findIndex(st => st.id === step) > idx;
            
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 
                  isCompleted ? 'text-blue-600' : 'text-zinc-400'
                }`}>
                  {s.icon}
                  <span className="text-[10px] font-bold">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-4 h-px bg-zinc-100 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[32px] shadow-2xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden relative flex items-center justify-center p-4 min-h-[60vh]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium">Chargement du PDF...</p>
          </div>
        ) : (
          <>
            {step === 'crop' && (
              <div style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }} className="origin-center shadow-lg">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={2 / 3}
                  className="bg-white"
                >
                  <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="PDF Page" className="max-w-full max-h-[60vh] object-contain" />
                </ReactCrop>
              </div>
            )}

            {step === 'print' && (
              <div className="flex flex-col items-center gap-6 text-center max-w-sm animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                  <Printer size={40} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Prêt à imprimer</h3>
                  <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                    L'étiquette a été recadrée au format 4x6".<br/>
                    Cliquez ci-dessous pour ouvrir le PDF, puis utilisez le bouton <strong>Partager</strong> d'iOS pour l'envoyer vers <strong>Labelife</strong>.
                  </p>
                </div>
                <button 
                  onClick={handleShareOrDownload}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-3 text-sm active:scale-95 transition-all"
                >
                  <Printer size={20} />
                  Imprimer
                </button>
              </div>
            )}

            {step === 'validate' && (
              <div className="flex flex-col items-center gap-6 text-center max-w-sm animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Impression lancée ?</h3>
                  <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                    Si l'impression s'est bien déroulée, validez pour passer la commande en "À envoyer".
                  </p>
                </div>
                {onPrintMarkAsSent && (
                  <button 
                    onClick={() => {
                      setHasDownloaded(false);
                      onPrintMarkAsSent();
                    }}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 text-sm active:scale-95 transition-all"
                  >
                    <Check size={20} />
                    Confirmer et Terminer
                  </button>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Zoom Controls (Only for crop step) */}
        {step === 'crop' && !isLoading && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-zinc-200 shadow-xl">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 text-zinc-600 hover:bg-zinc-50 rounded-full transition-colors">
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-mono text-zinc-600 w-10 text-center font-bold">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 text-zinc-600 hover:bg-zinc-50 rounded-full transition-colors">
              <ZoomIn size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
