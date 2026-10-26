import { useState, useCallback } from "react";
import imgImage5 from "../../imports/figma:asset/f9088f315ce734b792fb1beee4bbe487ccc3f1d5.png";

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  hasError: boolean;
  isProcessing: boolean;
}

export default function FileUpload({ onFilesChange, hasError, isProcessing }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    onFilesChange(files);
  }, [onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesChange(files);
    }
  }, [onFilesChange]);

  return (
    <div className="box-border content-stretch flex flex-col gap-1 items-end justify-start p-0 relative shrink-0 w-full">
      <div className="relative shrink-0 w-full">
        <div 
          className={`absolute border border-dashed inset-0 pointer-events-none ${isDragging ? 'border-primary' : 'border-ring'}`} 
        />
        <div 
          className="flex flex-col items-center justify-center relative size-full cursor-pointer hover:bg-surface-muted transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div className="box-border content-stretch flex flex-col items-center justify-center p-[32px] relative w-full">
            <div
              className="bg-center bg-cover bg-no-repeat shrink-0 size-[59px]"
              style={{ backgroundImage: `url('${imgImage5}')` }}
            />
            <div className=" font-normal leading-[0] min-w-full relative shrink-0 text-ink text-[0px] text-center" style={{ width: "min-content" }}>
              <p className="block font-bold leading-[normal] mb-0 text-primary text-[16px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                Carregue um arquivo
              </p>
              <p className="leading-[normal]">
                <span className=" text-[16px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  ou arraste e solte. 
                </span>
                <span className="italic italic text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  200mb por arquivo
                </span>
                <span className=" text-[16px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  <br />
                </span>
                <span className=" text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  ZIP, RAR, TXT, CSV, XLSX, DOCX, JSON, PDF.
                </span>
              </p>
            </div>
          </div>
        </div>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".zip,.rar,.txt,.csv,.xlsx,.docx,.json,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      
      {hasError && (
        <div className="flex flex-col font-normal justify-center leading-[0] relative shrink-0 text-[#ff2c34] text-[14px] text-left text-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
          <p className="block leading-[normal] whitespace-pre">Formato ou tamanho não suportado, tente novamente.</p>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-row items-center gap-2 mt-4">
          <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <div className="flex flex-col font-normal justify-center leading-[0] relative shrink-0 text-primary text-[14px] text-left text-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
            <p className="block leading-[normal] whitespace-pre">Processando arquivos...</p>
          </div>
        </div>
      )}
    </div>
  );
}