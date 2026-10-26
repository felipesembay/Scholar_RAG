import { DocsIcon, CloseIcon } from "./ModalIcons";

interface FileItem {
  id: string;
  name: string;
  size: string;
}

interface FileListProps {
  files: FileItem[];
  onRemoveFile: (id: string) => void;
}

function FileListItem({ file, onRemove }: { file: FileItem; onRemove: (id: string) => void }) {
  return (
    <div className="box-border content-stretch flex flex-row items-start justify-between p-0 relative shrink-0 w-full">
      <div className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative shrink-0">
        <DocsIcon />
        <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-ink text-[16px] text-left text-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
          <p className="block leading-[normal] whitespace-pre">{file.name}</p>
        </div>
        <div className="flex flex-col font-normal justify-center leading-[0] relative shrink-0 text-ink text-[14px] text-left text-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
          <p className="block leading-[normal] whitespace-pre">{file.size}</p>
        </div>
      </div>
      <button onClick={() => onRemove(file.id)} className="hover:scale-110 transition-transform cursor-pointer">
        <CloseIcon />
      </button>
    </div>
  );
}

export default function FileList({ files, onRemoveFile }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="box-border content-stretch flex flex-col gap-4 items-start justify-start p-0 relative shrink-0 w-full">
      {files.map((file) => (
        <FileListItem
          key={file.id}
          file={file}
          onRemove={onRemoveFile}
        />
      ))}
    </div>
  );
}