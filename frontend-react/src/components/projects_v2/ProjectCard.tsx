import { EditIcon, DeleteIcon } from "../icons";
import { useState } from "react";
import PasswordModal from "../modals/PasswordModal";
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  hasPassword?: boolean;
}    




interface ProjectCardProps {
  project: Project;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAccess: (project: Project, password?: string) => void;
}

function ActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12 sm:size-14 hover:bg-primary-soft-strong transition-colors cursor-pointer"
      onClick={(e) => {
        e.stopPropagation(); // Previne o clique no card
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
        e.stopPropagation(); // Previne o clique no card
        onClick();
      }}
    >
      <div className="relative shrink-0 size-5 sm:size-6">
        <DeleteIcon className="text-primary group-hover:text-red-600 transition-colors" />
      </div>
    </button>
  );
}     



export default function ProjectCard({ project, onEdit, onDelete, onAccess }: ProjectCardProps) {
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
    if (project.hasPassword) {
      setShowPasswordModal(true);
    } else {
      onAccess(project);
    }
  };

  const handlePasswordSubmit = (password: string) => {
    setShowPasswordModal(false);
    onAccess(project, password);
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
  };

  return (
    <>
      <div 
        className="bg-surface box-border content-stretch flex flex-col gap-4 sm:gap-6 items-start justify-between p-4 sm:p-6 relative rounded-xl shrink-0 min-h-[200px] sm:min-h-[240px] w-full cursor-pointer transition-all duration-300 hover:shadow-sm group"
        onClick={handleCardClick}
      >
        <div
          aria-hidden="true"
          className="absolute border border-line border-solid inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
        />
        
        {/* Content */}
        <div className="box-border content-stretch flex flex-col gap-3 sm:gap-4 items-start justify-start p-0 relative shrink-0 flex-1 w-full">
          {/* Project Name */}
          <div className=" font-bold leading-[1.2] relative shrink-0 text-ink text-lg sm:text-xl text-left">
            <p className="block leading-[normal] line-clamp-2">
              {project.name}
              {project.hasPassword && (
                <span className="text-primary ml-2 text-sm">🔒</span>
              )}
            </p>
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
        <div className="box-border content-stretch flex flex-row gap-2 sm:gap-3 items-center justify-end p-0 relative shrink-0 w-full">
          <ActionButton onClick={() => onEdit(project.id)} />
          <DeleteButton onClick={() => onDelete(project.id)} />
        </div>
      </div>

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordSubmit}
        projectName={project.name}
      />
    </>
  );
}


