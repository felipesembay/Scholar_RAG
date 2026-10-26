import { EditIcon, DeleteIcon } from "./icons";
import { useState } from "react";
import PasswordModal from "./modals/PasswordModal";
import { Folder } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  hasPassword?: boolean;
  username:string;
  qtd_documents:number;
  qtd_words:number;
  files: File[];
}

interface ProjectCardProps {
  project: Project;
  variant?: 'full' | 'simple';
  onSelect?: (project: Project) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAccess?: (project: Project, password?: string) => void;
  showActions?: boolean;
}

function ActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12 sm:size-14 hover:bg-primary-soft-strong transition-colors cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="relative shrink-0 size-5 sm:size-6">
        <EditIcon className="text-primary" />
      </div>
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12 sm:size-14 hover:bg-[#ffebee] transition-colors cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="relative shrink-0 size-5 sm:size-6">
        <DeleteIcon className="text-primary group-hover:text-red-600 transition-colors" />
      </div>
    </button>
  );
}

export default function ProjectCard({ 
  project, 
  variant = 'full',
  onSelect, 
  onEdit, 
  onDelete, 
  onAccess,
  showActions = true 
}: ProjectCardProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleCardClick = () => {
    if (variant === 'simple' && onSelect) {
      onSelect(project);
      return;
    }

    if (onAccess) {
      onAccess(project);
      // if (project.hasPassword) {
      //   setShowPasswordModal(true);
      // } else {
      //   onAccess(project);
      // }
      
    }
  };

  const handlePasswordSubmit = (password: string) => {
    setShowPasswordModal(false);
    if (onAccess) {
      onAccess(project, password);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
  };

  // Variant Simple - usado no Chatbot
  if (variant === 'simple') {
    return (
      <div 
        onClick={handleCardClick}
        className="bg-surface border border-line rounded-xl p-6 hover:shadow-sm hover:border-primary transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-soft p-3 rounded-xl group-hover:bg-primary transition-colors">
              <Folder className="size-6 text-primary group-hover:text-primary-foreground" />
            </div>
            <div>
              <div className=" font-bold text-ink text-[18px] mb-1">
                {project.name}
              </div>
              <div className=" text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                Criado em {formatDate(project.createdAt)}
              </div>
            </div>
          </div>
          {project.hasPassword && (
            <div className="bg-primary-soft px-3 py-1 rounded-lg">
              <div className=" font-bold text-primary text-[12px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                PROTEGIDO
              </div>
            </div>
          )}
        </div>
        
        <div className=" text-ink text-[16px] mb-4 line-clamp-2" style={{ fontVariationSettings: "'wdth' 100" }}>
          {project.description}
        </div>
        
        <div className="flex justify-between items-center text-[12px] text-muted-foreground">
          <span className="" style={{ fontVariationSettings: "'wdth' 100" }}>
            Último acesso: {formatDate(project.lastAccessed)}
          </span>
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <span className=" font-bold text-[12px]" style={{ fontVariationSettings: "'wdth' 100" }}>
              Selecionar
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Variant Full - usado na seção Projetos
  return (
    <>
      <div 
        className="bg-surface box-border content-stretch flex flex-col gap-4 sm:gap-6 items-start justify-between p-4 sm:p-6 relative rounded-xl shrink-0 min-h-[200px] sm:min-h-[240px] w-full cursor-pointer transition-all duration-300 hover:shadow-sm hover:border-primary group border border-line"
        onClick={handleCardClick}
      >
        <div
          aria-hidden="true"
          className="absolute border border-line border-solid inset-0 pointer-events-none rounded-xl transition-colors duration-300 group-hover:border-primary"
        />
        
        {/* Content */}
        <div className="box-border content-stretch flex flex-col gap-3 sm:gap-4 items-start justify-start p-0 relative shrink-0 flex-1 w-full">
          {/* Project Header with Password Badge */}
          <div className="flex items-start justify-between w-full">
            <div className="flex-1">
              {/* Project Name */}
              <div className=" font-bold leading-[1.2] relative shrink-0 text-ink text-lg sm:text-xl text-left">
                <p className="block leading-[normal] line-clamp-2">
                  {project.name}
                </p>
              </div>
            </div>
            {project.hasPassword && (
              <div className="bg-primary-soft px-3 py-1 rounded-lg ml-3">
                <div className="flex items-center gap-1">
                  <span className="text-primary text-sm">🔒</span>
                  <div className=" font-bold text-primary text-[12px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                    PROTEGIDO
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Project Description */}
          <div className=" font-normal leading-[1.4] relative shrink-0 text-muted-foreground text-sm sm:text-base text-left flex-1" style={{ fontVariationSettings: "'wdth' 100" }}>
            <p className="block leading-[normal] line-clamp-3">{project.description}</p>
          </div>
          
          {/* Dates */}
          <div className="box-border content-stretch flex flex-col gap-1 sm:gap-2 items-start justify-start p-0 relative shrink-0 w-full">
            <div className=" font-normal leading-[0] relative shrink-0 text-muted-foreground text-xs sm:text-sm text-left" style={{ fontVariationSettings: "'wdth' 100" }}>
              <p className="block leading-[normal] whitespace-pre">Criado em: {formatDate(project.createdAt)}</p>
            </div>
            <div className=" font-normal leading-[0] relative shrink-0 text-muted-foreground text-xs sm:text-sm text-left" style={{ fontVariationSettings: "'wdth' 100" }}>
              <p className="block leading-[normal] whitespace-pre">Último acesso: {formatDate(project.lastAccessed)}</p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {showActions && onEdit && onDelete && (
          <div className="box-border content-stretch flex flex-row gap-2 sm:gap-3 items-center justify-end p-0 relative shrink-0 w-full">
            <ActionButton onClick={() => onEdit(project.id)} />
            <DeleteButton onClick={() => onDelete(project.id)} />
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={handlePasswordCancel}
          onConfirm={handlePasswordSubmit}
          projectName={project.name}
        />
      )}
    </>
  );
}